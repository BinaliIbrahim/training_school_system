// src/views/charts/Charts.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CFormSelect,
  CFormLabel,
  CForm,
} from '@coreui/react';
import {
  CChartBar,
  CChartDoughnut,
  CChartLine,
  CChartPie,
  CChartPolarArea,
  CChartRadar,
} from '@coreui/react-chartjs';
import {
  collection,
  query,
  onSnapshot,
  getDoc,
  doc,
  getDocs,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { modernChartOptions, SMS_CHART_COLORS, lineChartDataset, barChartDataset, formatMK as fmtMK } from '../../utils/chartTheme';

const formatMK = fmtMK;
const COLORS = SMS_CHART_COLORS;
const ChartErrorBoundary = ({ children, chartName }) => {
  const [hasError, setHasError] = useState(false);

  return hasError ? (
    <div className="text-center text-muted p-4">
      <div>Unable to display {chartName}</div>
      <small>Chart configuration error</small>
    </div>
  ) : (
    <ErrorBoundaryInner setHasError={setHasError}>
      {children}
    </ErrorBoundaryInner>
  );
};

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.props.setHasError(false);
  }

  componentDidCatch(error) {
    console.error('Chart error:', error);
    this.props.setHasError(true);
  }

  render() {
    return this.props.children;
  }
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------
const Charts = () => {
  const navigate = useNavigate();

  // ---------- Auth & User Data ----------
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [managedUsers, setManagedUsers] = useState([]);
  const [subscriptionOk, setSubscriptionOk] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ---------- View Mode & Filtering ----------
  const [viewMode, setViewMode] = useState('overall'); // 'overall' or 'user'
  const [selectedUserId, setSelectedUserId] = useState('');

  // ---------- Firestore data ----------
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // -----------------------------------------------------------------
  // 1. AUTH + ROLE + SUBSCRIPTION CHECK
  // -----------------------------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthLoading(false);
        navigate('/login');
        return;
      }

      setUser(firebaseUser);

      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setAuthLoading(false);
          navigate('/login');
          return;
        }

        const data = snap.data();
        setUserRole(data.role || 'student');

        // For students, check subscription
        if (data.role === 'student') {
          if (!data.subscriptionenddate) {
            const msg = data.hasUsedTrial
              ? 'No active subscription. Subscribe to access InventoryMW.'
              : 'No active subscription. Start a 3-day free trial or subscribe.';
            alert(msg);
            navigate('/subscription');
            setAuthLoading(false);
            return;
          }

          const endDate = data.subscriptionenddate?.toDate
            ? data.subscriptionenddate.toDate()
            : new Date(data.subscriptionenddate);
          const startDate = data.subscriptionstartdate?.toDate
            ? data.subscriptionstartdate.toDate()
            : new Date(data.subscriptionstartdate);
          const now = new Date();

          if (isNaN(endDate.getTime()) || endDate < now) {
            const period =
              Math.abs(endDate - startDate) <= 3 * 24 * 60 * 60 * 1000
                ? 'free trial'
                : 'subscription';
            alert(
              `Your ${period} expired on ${endDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}. Please renew.`
            );
            navigate('/subscription');
            setAuthLoading(false);
            return;
          }
        }

        // For admin/super-admin, load managed users
        if (['admin', 'super-admin'].includes(data.role)) {
          await loadManagedUsers(data.role, firebaseUser.uid, data.managedUserIds);
        } else {
          setSubscriptionOk(true);
        }

      } catch (err) {
        console.error('Auth error:', err);
        alert('Failed to verify user: ' + err.message);
        navigate('/login');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // -----------------------------------------------------------------
  // 2. LOAD MANAGED USERS FOR ADMINS
  // -----------------------------------------------------------------
  const loadManagedUsers = async (role, userId, managedUserIds = []) => {
    try {
      let userList = [];
      
      if (role === 'super-admin') {
        // Super-admin can see all users
        const snapshot = await getDocs(collection(db, 'users'));
        userList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          userType: 'direct'
        }));
      } else if (role === 'admin') {
        // Admin can see their managed users + themselves
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userList = [{ id: userId, ...userDoc.data(), userType: 'self' }];
        }
        
        if (managedUserIds && managedUserIds.length > 0) {
          const userPromises = managedUserIds.map(async (managedId) => {
            const userDoc = await getDoc(doc(db, 'users', managedId));
            if (userDoc.exists()) {
              return { id: managedId, ...userDoc.data(), userType: 'managed' };
            }
            return null;
          });
          
          const managedUsers = (await Promise.all(userPromises)).filter(Boolean);
          userList.push(...managedUsers);
        }
      }
      
      setManagedUsers(userList);
      setSubscriptionOk(true);
    } catch (err) {
      console.error('Error loading managed users:', err);
      alert('Error loading managed users: ' + err.message);
    }
  };

  // -----------------------------------------------------------------
  // 3. LOAD DATA BASED ON USER ROLE
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!user || !subscriptionOk) return;

    const loadUserData = async () => {
      try {
        if (['admin', 'super-admin'].includes(userRole)) {
          // Load data from all managed users for admins
          await loadAllUserData(managedUsers);
        } else {
          // Load only current user's data for students
          await loadSingleUserData(user.uid);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user, subscriptionOk, userRole, managedUsers]);

  const loadSingleUserData = async (userId) => {
    try {
      const studentsCol = collection(db, `users/${userId}/students`);
      const coursesCol = collection(db, `users/${userId}/courses`);
      const cohortsCol = collection(db, `users/${userId}/cohorts`);

      const [studentsSnap, coursesSnap, cohortsSnap] = await Promise.all([
        getDocs(studentsCol),
        getDocs(coursesCol),
        getDocs(cohortsCol)
      ]);

      setAllStudents(studentsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        ownerId: userId,
        ownerName: 'You'
      })));

      setAllCourses(coursesSnap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        ownerId: userId,
        ownerName: 'You'
      })));

      setAllCohorts(cohortsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        ownerId: userId,
        ownerName: 'You'
      })));

      setDataLoading(false);
    } catch (err) {
      console.error('Error loading user data:', err);
      setDataLoading(false);
    }
  };

  const loadAllUserData = async (userList) => {
    try {
      let allStudentsData = [];
      let allCoursesData = [];
      let allCohortsData = [];

      // Load data from each user
      for (const userData of userList) {
        const userId = userData.id;
        
        try {
          // Load students
          const studentsSnapshot = await getDocs(collection(db, `users/${userId}/students`));
          const students = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ownerId: userId,
            ownerName: userData.fullName || userData.email || 'Unknown User',
            ownerType: userData.userType
          }));
          allStudentsData.push(...students);

          // Load courses
          const coursesSnapshot = await getDocs(collection(db, `users/${userId}/courses`));
          const courses = coursesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ownerId: userId,
            ownerName: userData.fullName || userData.email || 'Unknown User',
            ownerType: userData.userType
          }));
          allCoursesData.push(...courses);

          // Load cohorts
          const cohortsSnapshot = await getDocs(collection(db, `users/${userId}/cohorts`));
          const cohorts = cohortsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ownerId: userId,
            ownerName: userData.fullName || userData.email || 'Unknown User',
            ownerType: userData.userType
          }));
          allCohortsData.push(...cohorts);
        } catch (userErr) {
          console.error(`Error loading data for user ${userId}:`, userErr);
          // Continue with other users even if one fails
        }
      }

      setAllStudents(allStudentsData);
      setAllCourses(allCoursesData);
      setAllCohorts(allCohortsData);
      setDataLoading(false);
    } catch (err) {
      console.error('Error loading all user data:', err);
      setDataLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // 4. FILTER DATA BASED ON VIEW MODE AND SELECTED USER
  // -----------------------------------------------------------------
  const { students, courses, cohorts, currentViewInfo } = useMemo(() => {
    if (viewMode === 'overall' || userRole === 'student') {
      return {
        students: allStudents,
        courses: allCourses,
        cohorts: allCohorts,
        currentViewInfo: {
          title: userRole === 'student' ? 'My Analytics' : 'Overall Analytics',
          subtitle: userRole !== 'student' ? `Viewing data from ${managedUsers.length} user(s)` : '',
          isOverall: true
        }
      };
    }

    if (viewMode === 'user' && selectedUserId) {
      const filteredStudents = allStudents.filter(s => s.ownerId === selectedUserId);
      const filteredCourses = allCourses.filter(c => c.ownerId === selectedUserId);
      const filteredCohorts = allCohorts.filter(c => c.ownerId === selectedUserId);
      const selectedUser = managedUsers.find(u => u.id === selectedUserId);
      
      return {
        students: filteredStudents,
        courses: filteredCourses,
        cohorts: filteredCohorts,
        currentViewInfo: {
          title: `${selectedUser?.fullName || selectedUser?.email || 'User'}'s Analytics`,
          subtitle: `Viewing individual user data`,
          isOverall: false,
          selectedUserName: selectedUser?.fullName || selectedUser?.email || 'Selected User'
        }
      };
    }

    return {
      students: allStudents,
      courses: allCourses,
      cohorts: allCohorts,
      currentViewInfo: {
        title: 'Overall Analytics',
        subtitle: `Viewing data from ${managedUsers.length} user(s)`,
        isOverall: true
      }
    };
  }, [viewMode, selectedUserId, allStudents, allCourses, allCohorts, managedUsers, userRole]);

  // -----------------------------------------------------------------
  // 5. DERIVED DATA (memoised)
  // -----------------------------------------------------------------
  const chartData = useMemo(() => {
    // 1. Enrollments per course (grouped by course name and owner)
    const courseEnrollments = {};
    courses.forEach(course => {
      const key = `${course.name}|${course.ownerName}`;
      if (!courseEnrollments[key]) {
        courseEnrollments[key] = {
          courseName: course.name,
          ownerName: course.ownerName,
          count: 0,
          color: COLORS[Object.keys(courseEnrollments).length % COLORS.length]
        };
      }
    });

    students.forEach(student => {
      const course = courses.find(c => c.id === student.courseId && c.ownerId === student.ownerId);
      if (course) {
        const key = `${course.name}|${course.ownerName}`;
        if (courseEnrollments[key]) {
          courseEnrollments[key].count++;
        }
      }
    });

    const enrollLabels = Object.values(courseEnrollments).map(item => 
      currentViewInfo.isOverall ? `${item.courseName} (${item.ownerName})` : item.courseName
    );
    const enrollValues = Object.values(courseEnrollments).map(item => item.count);
    const enrollColors = Object.values(courseEnrollments).map(item => item.color);

    // 2. Payments over time (by registration month) - REAL DATA
    const monthMap = {};
    students.forEach((s) => {
      try {
        if (!s.registrationDate) return;
        const date = s.registrationDate?.toDate ? s.registrationDate.toDate() : new Date(s.registrationDate);
        if (isNaN(date.getTime())) return;
        
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + (s.amountPaid || 0);
      } catch (err) {
        console.error('Error processing student date:', err);
      }
    });

    // Sort months chronologically
    const sortedMonths = Object.keys(monthMap).sort();
    const monthLabels = sortedMonths.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(`${y}-${mo}-01`).toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
    });
    const monthValues = sortedMonths.map((k) => monthMap[k]);

    // 3. Gender distribution - REAL DATA
    const genderCount = { Male: 0, Female: 0, Other: 0 };
    students.forEach((s) => {
      const g = s.gender || 'Other';
      genderCount[g] = (genderCount[g] || 0) + 1;
    });

    // 4. Total paid vs balance - REAL DATA
    const totalPaid = students.reduce((sum, s) => sum + (parseFloat(s.amountPaid) || 0), 0);
    const totalBalance = students.reduce((sum, s) => {
      try {
        const course = courses.find((c) => c.id === s.courseId && c.ownerId === s.ownerId);
        const due = (parseFloat(course?.fee) || 0) + (parseFloat(s.registrationFee) || 0) + (parseFloat(s.boardingFee) || 0);
        const paid = parseFloat(s.amountPaid) || 0;
        return sum + Math.max(0, due - paid);
      } catch (err) {
        console.error('Error calculating balance:', err);
        return sum;
      }
    }, 0);

    // 5. Course fees by owner - REAL DATA (only for overall view)
    const ownerCourses = {};
    courses.forEach(course => {
      if (!ownerCourses[course.ownerName]) {
        ownerCourses[course.ownerName] = [];
      }
      ownerCourses[course.ownerName].push(course);
    });

    const feeLabels = [];
    const feeDatasets = [];
    
    if (currentViewInfo.isOverall) {
      Object.keys(ownerCourses).forEach((ownerName, ownerIndex) => {
        const ownerCoursesList = ownerCourses[ownerName];
        feeLabels.push(...ownerCoursesList.map(c => c.name));
        
        ownerCoursesList.forEach((course, courseIndex) => {
          if (!feeDatasets[ownerIndex]) {
            feeDatasets[ownerIndex] = {
              label: ownerName,
              data: new Array(ownerCoursesList.length).fill(0),
              backgroundColor: COLORS[ownerIndex % COLORS.length] + '88',
              borderColor: COLORS[ownerIndex % COLORS.length],
            };
          }
          feeDatasets[ownerIndex].data[courseIndex] = parseFloat(course.fee) || 0;
        });
      });
    } else {
      // For individual user view, show their courses
      courses.forEach((course, index) => {
        feeLabels.push(course.name);
        if (!feeDatasets[0]) {
          feeDatasets[0] = {
            label: currentViewInfo.selectedUserName || 'Course Fees',
            data: new Array(courses.length).fill(0),
            backgroundColor: COLORS[0] + '88',
            borderColor: COLORS[0],
          };
        }
        feeDatasets[0].data[index] = parseFloat(course.fee) || 0;
      });
    }

    // 6. User performance metrics (REAL DATA - only for overall view)
    const userMetrics = {};
    if (currentViewInfo.isOverall && userRole !== 'student') {
      managedUsers.forEach(user => {
        const userStudents = allStudents.filter(s => s.ownerId === user.id);
        const userCourses = allCourses.filter(c => c.ownerId === user.id);
        
        userMetrics[user.fullName || user.email] = {
          students: userStudents.length,
          courses: userCourses.length,
          collected: userStudents.reduce((sum, s) => sum + (parseFloat(s.amountPaid) || 0), 0),
          balance: userStudents.reduce((sum, s) => {
            try {
              const course = allCourses.find(c => c.id === s.courseId && c.ownerId === user.id);
              const due = (parseFloat(course?.fee) || 0) + (parseFloat(s.registrationFee) || 0) + (parseFloat(s.boardingFee) || 0);
              const paid = parseFloat(s.amountPaid) || 0;
              return sum + Math.max(0, due - paid);
            } catch (err) {
              console.error('Error calculating user balance:', err);
              return sum;
            }
          }, 0),
        };
      });
    }

    // 7. Payment methods distribution
    const paymentMethods = {};
    students.forEach(student => {
      const method = student.modeOfPayment || 'Not Specified';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    return {
      enrollLabels,
      enrollValues,
      enrollColors,
      monthLabels,
      monthValues,
      genderCount,
      totalPaid,
      totalBalance,
      feeLabels: [...new Set(feeLabels)], // Remove duplicates
      feeDatasets: feeDatasets.filter(dataset => dataset && dataset.data.length > 0 && dataset.data.some(val => val > 0)),
      userMetrics,
      paymentMethods,
      hasRealData: students.length > 0 || courses.length > 0,
      managedUsersCount: managedUsers.length,
      totalStudents: students.length,
      totalCourses: courses.length,
      currentViewInfo,
    };
  }, [students, courses, cohorts, userRole, managedUsers, currentViewInfo, allStudents, allCourses]);

  // -----------------------------------------------------------------
  // 6. HANDLE VIEW MODE CHANGES
  // -----------------------------------------------------------------
  const handleViewModeChange = (e) => {
    setViewMode(e.target.value);
    if (e.target.value === 'overall') {
      setSelectedUserId('');
    }
  };

  const handleUserChange = (e) => {
    setSelectedUserId(e.target.value);
  };

  // -----------------------------------------------------------------
  // 7. FIXED CHART OPTIONS (using Chart.js v3+ syntax)
  // -----------------------------------------------------------------
  const getUserPerformanceChartOptions = () => ({
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label === 'Collections (K)') {
              return `Collections: ${formatMK(value * 1000)}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value, index, values) {
            // For collections dataset, show values with K suffix
            const datasetIndex = this.getDatasetMeta?.(0)?.data?.[index]?.datasetIndex;
            if (datasetIndex === 2) {
              return value + 'K';
            }
            return value;
          }
        }
      }
    },
  });

  // -----------------------------------------------------------------
  // 8. LOADING UI
  // -----------------------------------------------------------------
  if (authLoading || dataLoading) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto">
          <CSpinner color="primary" />
          <div className="mt-2">
            {authLoading ? 'Verifying user...' : 'Loading your charts…'}
          </div>
        </CCol>
      </CRow>
    );
  }

  if (!subscriptionOk) {
    return null;
  }

  // -----------------------------------------------------------------
  // 9. RENDER
  // -----------------------------------------------------------------
  return (
    <div className="sms-analytics-page">
      {/* Analytics Hero */}
      <div className="sms-analytics-hero mb-4">
        <div>
          <div className="sms-overview-greeting">Analytics</div>
          <h2 className="sms-overview-title mb-1">{chartData.currentViewInfo.title}</h2>
          <p className="sms-overview-sub mb-0">
            {chartData.currentViewInfo.subtitle || 'Visual insights into your school performance'}
          </p>
        </div>
        {userRole !== 'student' && managedUsers.length > 0 && (
          <CForm className="d-flex align-items-end gap-3 flex-wrap">
            <div>
              <CFormLabel htmlFor="viewMode" className="small fw-semibold mb-1">View</CFormLabel>
              <CFormSelect id="viewMode" value={viewMode} onChange={handleViewModeChange} className="sms-select">
                <option value="overall">Overall Data</option>
                <option value="user">Individual User</option>
              </CFormSelect>
            </div>
            {viewMode === 'user' && (
              <div>
                <CFormLabel htmlFor="userSelect" className="small fw-semibold mb-1">User</CFormLabel>
                <CFormSelect id="userSelect" value={selectedUserId} onChange={handleUserChange} className="sms-select">
                  <option value="">Select a user</option>
                  {managedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.email} {u.userType === 'self' ? '(You)' : ''}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            )}
          </CForm>
        )}
      </div>

      {/* KPI strip */}
      <div className="sms-analytics-kpis mb-4">
        {[
          { label: 'Students', value: chartData.totalStudents, color: 'purple' },
          { label: 'Courses', value: chartData.totalCourses, color: 'blue' },
          { label: 'Collected', value: formatMK(chartData.totalPaid), color: 'green' },
          { label: 'Outstanding', value: formatMK(chartData.totalBalance), color: 'orange' },
        ].map((k) => (
          <div key={k.label} className={`sms-analytics-kpi sms-analytics-kpi--${k.color}`}>
            <span className="sms-analytics-kpi-val">{k.value}</span>
            <span className="sms-analytics-kpi-lbl">{k.label}</span>
          </div>
        ))}
      </div>

      <CRow>
        {/* Bar – Enrollments per Course (top 10) */}
        <CCol xs={12} lg={6}>
          <CCard className="sms-chart-card border-0 mb-4">
            <CCardHeader className="sms-chart-card-header">
              <div>
                <strong>Enrollments per Course</strong>
                {chartData.currentViewInfo.isOverall && (
                  <small className="d-block text-muted">Top courses by enrollment</small>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              <ChartErrorBoundary chartName="Enrollments Chart">
                {chartData.enrollLabels.length > 0 ? (
                  <div className="sms-chart-wrap">
                  <CChartBar
                    data={{
                      labels: chartData.enrollLabels.slice(0, 10),
                      datasets: [
                        barChartDataset(
                          'Students',
                          chartData.enrollValues.slice(0, 10),
                        ),
                      ],
                    }}
                    options={{
                      ...modernChartOptions,
                      plugins: {
                        ...modernChartOptions.plugins,
                        legend: { display: false },
                        tooltip: {
                          ...modernChartOptions.plugins.tooltip,
                          callbacks: { label: (ctx) => ` ${ctx.parsed.y} students` },
                        },
                      },
                      scales: {
                        ...modernChartOptions.scales,
                        y: { ...modernChartOptions.scales.y, title: { display: true, text: 'Students', color: '#94a3b8' } },
                      },
                    }}
                  />
                  </div>
                ) : (
                  <div className="text-center text-muted p-4">No enrollment data available</div>
                )}
              </ChartErrorBoundary>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Line – Monthly Collections */}
        <CCol xs={12} lg={6}>
          <CCard className="sms-chart-card border-0 mb-4">
            <CCardHeader className="sms-chart-card-header">
              <div>
                <strong>Monthly Collections</strong>
                <small className="d-block text-muted">Revenue over time</small>
              </div>
            </CCardHeader>
            <CCardBody>
              <ChartErrorBoundary chartName="Monthly Collections Chart">
                {chartData.monthLabels.length > 0 ? (
                  <div className="sms-chart-wrap">
                  <CChartLine
                    data={{
                      labels: chartData.monthLabels,
                      datasets: [
                        lineChartDataset('Collections (MWK)', chartData.monthValues, '#6366f1'),
                      ],
                    }}
                    options={{
                      ...modernChartOptions,
                      plugins: {
                        ...modernChartOptions.plugins,
                        legend: { display: false },
                        tooltip: {
                          ...modernChartOptions.plugins.tooltip,
                          callbacks: { label: (ctx) => formatMK(ctx.parsed.y) },
                        },
                      },
                      scales: {
                        ...modernChartOptions.scales,
                        y: {
                          ...modernChartOptions.scales.y,
                          ticks: { ...modernChartOptions.scales.y.ticks, callback: (v) => formatMK(v) },
                        },
                      },
                    }}
                  />
                  </div>
                ) : (
                  <div className="text-center text-muted p-4">No payment data available</div>
                )}
              </ChartErrorBoundary>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Doughnut – Gender Distribution */}
        <CCol xs={12} lg={6}>
          <CCard className="mb-4">
            <CCardHeader>Student Gender Distribution</CCardHeader>
            <CCardBody>
              <ChartErrorBoundary chartName="Gender Distribution Chart">
                {Object.values(chartData.genderCount).some(count => count > 0) ? (
                  <CChartDoughnut
                    data={{
                      labels: Object.keys(chartData.genderCount),
                      datasets: [
                        {
                          backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
                          data: Object.values(chartData.genderCount),
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const total = chartData.totalStudents;
                              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                              return `${context.label}: ${context.parsed} students (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    No gender data available
                  </div>
                )}
              </ChartErrorBoundary>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Pie – Financial Overview */}
        <CCol xs={12} lg={6}>
          <CCard className="mb-4">
            <CCardHeader>Financial Overview</CCardHeader>
            <CCardBody>
              <ChartErrorBoundary chartName="Financial Overview Chart">
                {chartData.totalPaid > 0 || chartData.totalBalance > 0 ? (
                  <CChartPie
                    data={{
                      labels: ['Amount Collected', 'Pending Balance'],
                      datasets: [
                        {
                          data: [chartData.totalPaid, chartData.totalBalance],
                          backgroundColor: ['#4BC0C0', '#FF6384'],
                          hoverBackgroundColor: ['#3AA8A8', '#E5536D'],
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.label}: ${formatMK(context.parsed)}`
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    No financial data available
                  </div>
                )}
              </ChartErrorBoundary>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Polar Area – Course Fees */}
        {userRole !== 'student' && (
          <CCol xs={12} lg={6}>
            <CCard className="mb-4">
              <CCardHeader>
                Course Fees
                {!chartData.currentViewInfo.isOverall && <small className="text-muted"> ({chartData.currentViewInfo.selectedUserName})</small>}
              </CCardHeader>
              <CCardBody>
                <ChartErrorBoundary chartName="Course Fees Chart">
                  {chartData.feeLabels.length > 0 && chartData.feeDatasets.length > 0 ? (
                    <CChartPolarArea
                      data={{
                        labels: chartData.feeLabels,
                        datasets: chartData.feeDatasets,
                      }}
                      options={{
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const label = context.dataset.label || 'Course Fee';
                                return `${label}: ${formatMK(context.parsed.r)}`;
                              }
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted p-4">
                      No course fee data available
                    </div>
                  )}
                </ChartErrorBoundary>
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* Bar – User Performance (Overall view only for Admin/Super-Admin) */}
        {userRole !== 'student' && chartData.currentViewInfo.isOverall && Object.keys(chartData.userMetrics).length > 0 && (
          <CCol xs={12} lg={6}>
            <CCard className="mb-4">
              <CCardHeader>User Performance Metrics</CCardHeader>
              <CCardBody>
                <ChartErrorBoundary chartName="User Performance Chart">
                  <CChartBar
                    data={{
                      labels: Object.keys(chartData.userMetrics),
                      datasets: [
                        {
                          label: 'Students',
                          backgroundColor: '#41B883',
                          data: Object.values(chartData.userMetrics).map(m => m.students),
                        },
                        {
                          label: 'Courses',
                          backgroundColor: '#FFCE56',
                          data: Object.values(chartData.userMetrics).map(m => m.courses),
                        },
                        {
                          label: 'Collections (K)',
                          backgroundColor: '#36A2EB',
                          data: Object.values(chartData.userMetrics).map(m => Math.round(m.collected / 1000)),
                        },
                      ],
                    }}
                    options={getUserPerformanceChartOptions()}
                  />
                </ChartErrorBoundary>
              </CCardBody>
            </CCard>
          </CCol>
        )}

        {/* Payment Methods Distribution */}
        <CCol xs={12} lg={userRole === 'student' || !chartData.currentViewInfo.isOverall ? 6 : 12}>
          <CCard className="mb-4">
            <CCardHeader>Payment Methods Distribution</CCardHeader>
            <CCardBody>
              <ChartErrorBoundary chartName="Payment Methods Chart">
                {Object.keys(chartData.paymentMethods).length > 0 ? (
                  <CChartDoughnut
                    data={{
                      labels: Object.keys(chartData.paymentMethods),
                      datasets: [
                        {
                          backgroundColor: COLORS.slice(0, Object.keys(chartData.paymentMethods).length),
                          data: Object.values(chartData.paymentMethods),
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.label}: ${context.parsed} students`
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    No payment method data available
                  </div>
                )}
              </ChartErrorBoundary>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default Charts;