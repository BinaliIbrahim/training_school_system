// Unified school dashboard — admin, super-admin (write), teacher (read-only)
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CBadge,
  CAvatar,
  CTooltip,
  CAlert,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CPagination,
  CPaginationItem,
  CNav,
  CNavItem,
  CNavLink,
  CListGroup,
  CListGroupItem,
  CProgressBar,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilCloudDownload,
  cilPeople,
  cilPencil,
  cilTrash,
  cilSearch,
  cilFile,
  cilMoney,
  cilBook,
  cilHome,
  cilCalendar,
  cilUser,
  cilChart,
  cilBuilding,
  cilDollar,
  cilCreditCard,
  cilBank,
  cilCash,
  cilList,
  cilOptions,
  cilArrowRight,
  cilArrowLeft,
  cilWarning,
  cilArrowCircleLeft,
  cilPlus,
} from '@coreui/icons';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  where,
  getDocs,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../firebase';
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  isAfter,
  isBefore,
  subDays,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
} from 'date-fns';
import {
  downloadStudentsReport,
  downloadPaymentsAudit,
  downloadStudentReceipt,
} from '../../utils/pdfReports';
import SchoolOverviewPanel from '../../components/dashboard/SchoolOverviewPanel';
import DailyMomentum from '../../components/engagement/DailyMomentum';
import PaymentAuditModal from '../../components/dashboard/PaymentAuditModal';
import UserStatsModal from '../../components/dashboard/UserStatsModal';
import CohortsPanel from '../../components/dashboard/CohortsPanel';
import CohortDetailPanel from '../../components/dashboard/CohortDetailPanel';
import CoursesPanel from '../../components/dashboard/CoursesPanel';
import SectionGuide from '../../components/dashboard/SectionGuide';
import { canUserCreate, canUserEdit, canUserDelete, isUserApproved, APPROVAL } from '../../utils/permissions';
import {
  canManageCatalog as roleCanManageCatalog,
  getCatalogOwnerId,
  resolveCatalogOwnerId,
  mergeCatalogItems,
  findCourseForStudent,
  findCohortForStudent,
  getCourseFeeForStudent,
  studentMatchesCohort,
  studentMatchesCourse,
  calcTotalDueForStudent,
  calcBalanceForStudent,
  isEligibleForEquipmentAndCertificates,
} from '../../utils/schoolCatalog';
import { notifyCrud } from '../../utils/notifications';
import { matchesSearchQuery } from '../../utils/search';
import { useAppToast } from '../../hooks/useAppToast';
import { StudentStatusBadge, StudentEligibilityBanner } from '../../components/dashboard/StudentEligibility';

const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
  }).format(amount);

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [subscriptionOk, setSubscriptionOk] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);
  const [catalogOwnerId, setCatalogOwnerId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDue, setTotalDue] = useState(0);

  const [activeSection, setActiveSection] = useState('overview');
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedCohortDetails, setSelectedCohortDetails] = useState(null);
  const [cohortStudents, setCohortStudents] = useState([]);
  const [cohortCourses, setCohortCourses] = useState([]);
  const [cohortPayments, setCohortPayments] = useState([]);

  const [userStatsModal, setUserStatsModal] = useState(false);
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [editStudentModal, setEditStudentModal] = useState(false);
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [editCourseModal, setEditCourseModal] = useState(false);
  const [addCourseModal, setAddCourseModal] = useState(false);
  const [editCohortModal, setEditCohortModal] = useState(false);
  const [addCohortModal, setAddCohortModal] = useState(false);
  const [editPaymentModal, setEditPaymentModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [paymentHistoryModal, setPaymentHistoryModal] = useState(false);
  const [allPaymentsModal, setAllPaymentsModal] = useState(false);
  const [studentDetailModal, setStudentDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [studentForm, setStudentForm] = useState({
    name: '',
    phoneNumber: '',
    age: '',
    gender: '',
    courseId: '',
    cohortId: '',
    registrationFee: '',
    trainingFee: '',
    boardingFee: '',
    amountPaid: '',
    modeOfPayment: '',
    transId: '',
  });

  const [courseForm, setCourseForm] = useState({
    name: '',
    fee: '',
    type: 'weekly',
    weeksOrMonths: '',
    cohortId: '',
    duration: '',
  });

  const [cohortForm, setCohortForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    status: 'active',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  const [newPaymentForm, setNewPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterCohort, setFilterCohort] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [studentOwnerId, setStudentOwnerId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [dateFilter, setDateFilter] = useState('Month');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentDateFilter, setPaymentDateFilter] = useState('all');

  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const paymentsPerPage = 10;

  const [formErrors, setFormErrors] = useState({});
  const appToast = useAppToast();

  const showAlert = (message, color = 'success') => {
    if (color === 'success' || color === 'primary') {
      appToast.success(message);
    } else if (color === 'danger') {
      appToast.error(message);
    } else if (color === 'warning') {
      appToast.warning(message);
    } else {
      appToast.info(message);
    }
  };

  const crudProfile = useMemo(
    () => ({ role: userRole, ...userProfile, approvalStatus: userProfile?.approvalStatus }),
    [userRole, userProfile],
  );

  const canCreate = useMemo(() => canUserCreate(crudProfile), [crudProfile]);
  const canEdit = useMemo(() => canUserEdit(crudProfile), [crudProfile]);
  const canDelete = useMemo(() => canUserDelete(crudProfile), [crudProfile]);
  const canManageCatalog = useMemo(() => roleCanManageCatalog(userRole), [userRole]);

  const catalogCourses = useMemo(
    () => (catalogOwnerId ? allCourses.filter((c) => c.ownerId === catalogOwnerId) : allCourses),
    [allCourses, catalogOwnerId],
  );

  const catalogCohorts = useMemo(
    () => (catalogOwnerId ? allCohorts.filter((c) => c.ownerId === catalogOwnerId) : allCohorts),
    [allCohorts, catalogOwnerId],
  );

  const studentOwnerOptions = useMemo(() => {
    if (userRole === 'teacher') {
      return managedUsers.filter((u) => u.id === user?.uid)
    }
    const team = managedUsers.filter((u) => u.userType === 'managed')
    return team.length > 0 ? team : managedUsers
  }, [managedUsers, userRole, user?.uid]);

  const applyCourseToStudentForm = (courseId, prevForm) => ({
    ...prevForm,
    courseId,
  })

  const formCourseFee = useMemo(() => {
    const course = catalogCourses.find((c) => c.id === studentForm.courseId)
    return course?.fee ?? null
  }, [studentForm.courseId, catalogCourses])

  const requirePermission = (type) => {
    const allowed = { create: canCreate, edit: canEdit, delete: canDelete }[type];
    if (!allowed) {
      showAlert(`You do not have "${type}" permission. Ask your admin to grant it in My Users.`, 'warning');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (location.state?.focusUserId) {
      setFilterUser(location.state.focusUserId);
    }
  }, [location.state?.focusUserId]);

  // -------------------------------------------------
  // AUTH + ROLE + SUBSCRIPTION CHECK
  // -------------------------------------------------
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
        const userRole = data.role;
        setUserRole(userRole);
        setUserProfile(data);

        if (!['admin', 'super-admin', 'teacher'].includes(userRole)) {
          showAlert('Access denied. Admin or Teacher privileges required.', 'danger');
          navigate('/dashboard');
          return;
        }

        if (!isUserApproved(data)) {
          const msg =
            data.approvalStatus === APPROVAL.PENDING
              ? 'Your account is pending super-admin approval.'
              : 'Your account was not approved. Contact your administrator.';
          showAlert(msg, 'warning');
          navigate('/login');
          setAuthLoading(false);
          return;
        }

        // Subscription check only for Admin users
        if (userRole === 'admin') {
          if (!data.subscriptionenddate) {
            const msg = data.hasUsedTrial
              ? 'No active subscription. Subscribe to access the system.'
              : 'No active subscription. Start a 3-day free trial or subscribe.';
            showAlert(msg, 'warning');
            navigate('/subscription');
            setAuthLoading(false);
            return;
          }

          const endDate = data.subscriptionenddate?.toDate
            ? data.subscriptionenddate.toDate()
            : new Date(data.subscriptionenddate);
          const now = new Date();

          if (isNaN(endDate.getTime()) || endDate < now) {
            const period =
              Math.abs(endDate - new Date(data.subscriptionstartdate)) <=
              3 * 24 * 60 * 60 * 1000
                ? 'free trial'
                : 'subscription';
            showAlert(
              `Your ${period} expired on ${endDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}. Please renew.`,
              'warning'
            );
            navigate('/subscription');
            setAuthLoading(false);
            return;
          }
        }

        setSubscriptionOk(true);
        const catalogId = await resolveCatalogOwnerId(
          db,
          { id: firebaseUser.uid, ...data },
          userRole,
          firebaseUser.uid,
        );
        setCatalogOwnerId(catalogId);
        await loadManagedUsers(userRole, firebaseUser.uid, data.managedUserIds, data.managedBy, catalogId);
        
      } catch (err) {
        console.error('Auth error:', err);
        showAlert('Failed to verify user: ' + err.message, 'danger');
        navigate('/login');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // -------------------------------------------------
  // LOAD MANAGED USERS
  // -------------------------------------------------
  const loadManagedUsers = async (role, userId, managedUserIds = [], managedBy = null, catalogId = null) => {
    try {
      let userList = [];
      let catalogOwnerIds = [];
      
      if (role === 'super-admin') {
        const snapshot = await getDocs(collection(db, 'users'));
        userList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          userType: 'direct'
        }));
        catalogOwnerIds = [...new Set(
          userList
            .filter((u) => u.role === 'admin' || u.role === 'super-admin')
            .map((u) => u.id),
        )];
      } else if (role === 'admin') {
        userList = [{ id: userId, userType: 'self' }];
        
        if (managedUserIds && managedUserIds.length > 0) {
          const userPromises = managedUserIds.map(async (managedId) => {
            const userDoc = await getDoc(doc(db, 'users', managedId));
            if (userDoc.exists()) {
              return { id: managedId, ...userDoc.data(), userType: 'managed' };
            }
            return null;
          });
          
          const managedUsersList = (await Promise.all(userPromises)).filter(Boolean);
          userList.push(...managedUsersList);
        }
        catalogOwnerIds = [userId];
      } else if (role === 'teacher') {
        userList = [{ id: userId, userType: 'self' }];
        if (managedBy) {
          catalogOwnerIds = [managedBy];
        } else if (catalogId) {
          catalogOwnerIds = [catalogId];
        }
      }
      
      setManagedUsers(userList);
      await loadAllUserData(userList, catalogOwnerIds);
    } catch (err) {
      console.error('Error loading managed users:', err);
      showAlert('Error loading managed users: ' + err.message, 'danger');
      setDataLoading(false);
    }
  };

  // -------------------------------------------------
  // LOAD ALL USER DATA
  // -------------------------------------------------
  const loadAllUserData = async (userList, catalogOwnerIds = []) => {
    try {
      let allStudentsData = [];
      let allCoursesData = [];
      let allCohortsData = [];
      let allPaymentsData = [];

      for (const userData of userList) {
        const userId = userData.id;
        
        // Students & payments belong to each team member
        try {
          const studentsQuery = query(collection(db, `users/${userId}/students`));
          const studentsSnapshot = await getDocs(studentsQuery);
          const students = studentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              ownerId: userId,
              ownerName: userData.fullName || userData.email || `User ${userId.substring(0, 8)}`,
              ownerType: userData.userType
            };
          });
          allStudentsData.push(...students);
        } catch (err) {
          console.error(`Error loading students for user ${userId}:`, err);
        }

        try {
          const paymentsQuery = query(collection(db, `users/${userId}/payments`));
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const payments = paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              ownerId: userId,
              ownerName: userData.fullName || userData.email || `User ${userId.substring(0, 8)}`,
              ownerType: userData.userType
            };
          });
          allPaymentsData.push(...payments);
        } catch (err) {
          console.error(`Error loading payments for user ${userId}:`, err);
        }

        // Legacy workspace courses/cohorts (created before shared admin catalog)
        try {
          const legacyCoursesSnapshot = await getDocs(query(collection(db, `users/${userId}/courses`)));
          allCoursesData.push(
            ...legacyCoursesSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              ownerId: userId,
              ownerName: userData.fullName || userData.email || `User ${userId.substring(0, 8)}`,
              ownerType: userData.userType,
              legacy: true,
            })),
          );
        } catch (err) {
          console.error(`Error loading legacy courses for user ${userId}:`, err);
        }

        try {
          const legacyCohortsSnapshot = await getDocs(query(collection(db, `users/${userId}/cohorts`)));
          allCohortsData.push(
            ...legacyCohortsSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              ownerId: userId,
              ownerName: userData.fullName || userData.email || `User ${userId.substring(0, 8)}`,
              ownerType: userData.userType,
              legacy: true,
            })),
          );
        } catch (err) {
          console.error(`Error loading legacy cohorts for user ${userId}:`, err);
        }
      }

      // Courses & cohorts live in the school admin catalog only
      const uniqueCatalogIds = [...new Set(catalogOwnerIds.filter(Boolean))];
      for (const catalogId of uniqueCatalogIds) {
        let catalogUser = userList.find((u) => u.id === catalogId);
        if (!catalogUser) {
          const catalogSnap = await getDoc(doc(db, 'users', catalogId));
          if (catalogSnap.exists()) {
            catalogUser = { id: catalogId, ...catalogSnap.data(), userType: 'catalog' };
          }
        }
        const catalogName =
          catalogUser?.fullName || catalogUser?.email || `Admin ${catalogId.substring(0, 8)}`;

        try {
          const coursesSnapshot = await getDocs(query(collection(db, `users/${catalogId}/courses`)));
          allCoursesData.push(
            ...coursesSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              ownerId: catalogId,
              ownerName: catalogName,
              ownerType: 'catalog',
            })),
          );
        } catch (err) {
          console.error(`Error loading catalog courses for ${catalogId}:`, err);
        }

        try {
          const cohortsSnapshot = await getDocs(query(collection(db, `users/${catalogId}/cohorts`)));
          allCohortsData.push(
            ...cohortsSnapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              ownerId: catalogId,
              ownerName: catalogName,
              ownerType: 'catalog',
            })),
          );
        } catch (err) {
          console.error(`Error loading catalog cohorts for ${catalogId}:`, err);
        }
      }

      setAllStudents(allStudentsData);
      setAllCourses(mergeCatalogItems(allCoursesData, []));
      setAllCohorts(mergeCatalogItems(allCohortsData, []));
      setAllPayments(allPaymentsData);
      setDataLoading(false);
      
      calculateTotals(allStudentsData, mergeCatalogItems(allCoursesData, []));
    } catch (err) {
      console.error('Error loading user data:', err);
      showAlert('Error loading user data: ' + err.message, 'danger');
      setDataLoading(false);
    }
  };

  // -------------------------------------------------
  // CALCULATE TOTALS
  // -------------------------------------------------
  const calculateTotals = (students, courses) => {
    let collected = 0;
    let balance = 0;
    let totalDueAmount = 0;

    students.forEach((s) => {
      const totalDue = calcTotalDueForStudent(s, courses, catalogOwnerId);
      const paid = s.amountPaid ?? 0;
      collected += paid;
      balance += totalDue - paid;
      totalDueAmount += totalDue;
    });

    setTotalCollected(collected);
    setTotalBalance(balance);
    setTotalDue(totalDueAmount);
  };

  // -------------------------------------------------
  // DATE RANGE LOGIC (From Dashboard)
  // -------------------------------------------------
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'Week':
        return { start: subDays(startOfDay(now), 7), end: endOfDay(now) };
      case 'Month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'Year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  // -------------------------------------------------
  // FILTERED STUDENTS BY DATE (From Dashboard)
  // -------------------------------------------------
  const filteredStudentsByDate = useMemo(() => {
    return allStudents.filter((s) => {
      if (!s.registrationDate) return true;
      if (s.registrationDate?.toDate) {
        const regDate = s.registrationDate.toDate();
        return isWithinInterval(regDate, { start: rangeStart, end: rangeEnd });
      }
      return true;
    });
  }, [allStudents, dateFilter]);

  // -------------------------------------------------
  // VALIDATIONS (From Dashboard)
  // -------------------------------------------------
  const validateStudent = () => {
    const e = {};
    if (!studentForm.name) e.name = 'Name required';
    if (!studentForm.courseId) e.courseId = 'Select a course';
    if (!studentForm.cohortId) e.cohortId = 'Select a cohort';
    if (!studentForm.age || studentForm.age <= 0) e.age = 'Valid age required';
    if (!studentForm.gender) e.gender = 'Select gender';
    if (studentForm.registrationFee && studentForm.registrationFee < 0) e.registrationFee = '≥ 0';
    if (studentForm.amountPaid && studentForm.amountPaid < 0) e.amountPaid = '≥ 0';
    if (studentForm.phoneNumber && !/^\d{10}$/.test(studentForm.phoneNumber)) e.phoneNumber = 'Valid 10-digit phone required';
    return e;
  };

  const validatePayment = () => {
    const e = {};
    const amount = parseFloat(newPaymentForm.amount);
    
    if (!newPaymentForm.amount || newPaymentForm.amount.trim() === '' || isNaN(amount)) {
      e.amount = 'Please enter a valid number';
    } 
    else if (amount <= 0) {
      e.amount = 'Amount must be greater than 0';
    }
    else if (amount > 10000000) {
      e.amount = 'Amount seems too large';
    }
    
    if (!newPaymentForm.paymentMethod) {
      e.paymentMethod = 'Please select a payment method';
    }
    
    return e;
  };

  const calcTotalDue = (student) => calcTotalDueForStudent(student, allCourses, catalogOwnerId);
  const calcBalance = (student) => calcBalanceForStudent(student, allCourses, catalogOwnerId);

  // -------------------------------------------------
  // FILTERED DATA (Updated with Dashboard logic)
  // -------------------------------------------------
  const filteredCohorts = useMemo(() => {
    return allCohorts.filter((c) =>
      matchesSearchQuery(searchQuery, c.name, c.description, c.ownerName),
    );
  }, [allCohorts, searchQuery]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((c) => {
      const matchesSearch = matchesSearchQuery(searchQuery, c.name, c.description, c.type, c.ownerName);
      const matchesType = !filterType || c.type === filterType;
      const matchesDuration = !filterDuration || c.weeksOrMonths === parseInt(filterDuration);
      const matchesCohort = !filterCohort || c.cohortId === filterCohort;
      return matchesSearch && matchesType && matchesDuration && matchesCohort;
    });
  }, [allCourses, searchQuery, filterType, filterDuration, filterCohort]);

  const filteredStudents = useMemo(() => {
    return filteredStudentsByDate.filter((s) => {
      const matchesSearch = matchesSearchQuery(
        searchQuery,
        s.name,
        s.phoneNumber,
        s.phone,
        s.ownerName,
        s.transId,
        s.modeOfPayment,
        s.courseName,
        s.cohortName,
      );
      const matchesCourse = !filterCourse || s.courseId === filterCourse;
      const matchesCohort = !filterCohort || s.cohortId === filterCohort;
      const matchesUser = !filterUser || s.ownerId === filterUser;
      const matchesPaymentMethod = !filterPaymentMethod || s.modeOfPayment === filterPaymentMethod;
      const matchesPaymentStatus = !filterPaymentStatus ||
        (filterPaymentStatus === 'paid' ? calcBalance(s) <= 0 : calcBalance(s) > 0);
      return matchesSearch && matchesCourse && matchesCohort && matchesUser && matchesPaymentMethod && matchesPaymentStatus;
    });
  }, [filteredStudentsByDate, searchQuery, filterCourse, filterCohort, filterUser, filterPaymentMethod, filterPaymentStatus, allCourses, catalogOwnerId]);

  const hasActiveStudentFilters = Boolean(
    searchQuery || filterUser || filterPaymentMethod || filterPaymentStatus || filterCourse || filterCohort,
  );

  const displayCohorts = useMemo(() => {
    if (!hasActiveStudentFilters) return filteredCohorts;
    const linked = new Set(
      filteredStudents
        .filter((s) => s.cohortId)
        .map((s) => `${s.ownerId}-${s.cohortId}`),
    );
    return filteredCohorts.filter((c) => linked.has(`${c.ownerId}-${c.id}`));
  }, [filteredCohorts, filteredStudents, hasActiveStudentFilters]);

  const displayCourses = useMemo(() => {
    if (!hasActiveStudentFilters) return filteredCourses;
    const linked = new Set(
      filteredStudents
        .filter((s) => s.courseId)
        .map((s) => `${s.ownerId}-${s.courseId}`),
    );
    return filteredCourses.filter((c) => linked.has(`${c.ownerId}-${c.id}`));
  }, [filteredCourses, filteredStudents, hasActiveStudentFilters]);

  useEffect(() => {
    calculateTotals(filteredStudents, allCourses);
  }, [filteredStudents, allCourses]);

  // -------------------------------------------------
  // COMPLETE PAYMENT AUDIT LOGIC (From Dashboard)
  // -------------------------------------------------
  const getAllPaymentsWithInitial = useMemo(() => {
    const combinedPayments = [...allPayments];
    
    allStudents.forEach(student => {
      if (student.amountPaid > 0) {
        combinedPayments.push({
          id: `initial-${student.id}`,
          amount: student.amountPaid,
          paymentMethod: student.modeOfPayment || 'initial',
          referenceNumber: student.transId || 'INITIAL',
          notes: 'Initial payment at registration',
          studentId: student.id,
          studentName: student.name,
          courseId: student.courseId,
          cohortId: student.cohortId,
          ownerId: student.ownerId,
          ownerName: student.ownerName,
          ownerType: student.ownerType,
          paymentDate: student.registrationDate,
          transactionType: 'initial',
          isInitialPayment: true
        });
      }
    });

    return combinedPayments.sort((a, b) => {
      const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(0);
      const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [allPayments, allStudents]);

  const filteredPayments = useMemo(() => {
    let filtered = getAllPaymentsWithInitial;

    if (paymentSearchQuery) {
      filtered = filtered.filter((p) =>
        matchesSearchQuery(
          paymentSearchQuery,
          p.studentName,
          p.ownerName,
          p.referenceNumber,
          p.paymentMethod,
          p.notes,
          p.amount,
        ),
      );
    }

    if (paymentDateFilter !== 'all') {
      const now = new Date();
      let startDate, endDate;

      switch (paymentDateFilter) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = subDays(startOfDay(now), 7);
          endDate = endOfDay(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter(p => {
          if (!p.paymentDate?.toDate) return false;
          const paymentDate = p.paymentDate.toDate();
          return isWithinInterval(paymentDate, { start: startDate, end: endDate });
        });
      }
    }

    return filtered;
  }, [getAllPaymentsWithInitial, paymentSearchQuery, paymentDateFilter]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPaymentPage - 1) * paymentsPerPage;
    return filteredPayments.slice(startIndex, startIndex + paymentsPerPage);
  }, [filteredPayments, currentPaymentPage]);

  const totalPaymentPages = Math.ceil(filteredPayments.length / paymentsPerPage);

  // -------------------------------------------------
  // STUDENTS WITH/WITHOUT BOARDING (From Dashboard)
  // -------------------------------------------------
  const studentsWithBoarding = filteredStudents.filter(s => (s.boardingFee ?? 0) > 0);
  const studentsWithoutBoarding = filteredStudents.filter(s => (s.boardingFee ?? 0) === 0);

  // -------------------------------------------------
  // USER STATISTICS
  // -------------------------------------------------
  const userStatistics = useMemo(() => {
    return managedUsers.map(managedUser => {
      const userStudents = allStudents.filter(s => s.ownerId === managedUser.id);
      const userPayments = allPayments.filter(p => p.ownerId === managedUser.id);
      
      let userCollected = 0;
      let userBalance = 0;
      let userTotalDue = 0;
      
      userStudents.forEach(s => {
        const totalDue = calcTotalDueForStudent(s, allCourses, catalogOwnerId);
        const paid = s.amountPaid ?? 0;
        userCollected += paid;
        userBalance += totalDue - paid;
        userTotalDue += totalDue;
      });

      const activeCohortIds = new Set(userStudents.map((s) => s.cohortId).filter(Boolean));
      const activeCourseIds = new Set(userStudents.map((s) => s.courseId).filter(Boolean));

      return {
        ...managedUser,
        studentCount: userStudents.length,
        courseCount: activeCourseIds.size,
        cohortCount: activeCohortIds.size,
        paymentCount: userPayments.length,
        totalCollected: userCollected,
        totalBalance: userBalance,
        totalDue: userTotalDue
      };
    });
  }, [managedUsers, allStudents, allCourses, allCohorts, allPayments, catalogOwnerId]);

  const teamFinance = useMemo(() => {
    return managedUsers
      .filter((u) => u.userType === 'managed')
      .filter((u) => !filterUser || u.id === filterUser)
      .map((managedUser) => {
        const userStudents = filteredStudents.filter((s) => s.ownerId === managedUser.id);
        let totalDue = 0;
        let totalCollected = 0;
        let totalBalance = 0;
        let pendingStudents = 0;

        userStudents.forEach((s) => {
          const due = calcTotalDueForStudent(s, allCourses, catalogOwnerId);
          const paid = s.amountPaid ?? 0;
          const balance = calcBalanceForStudent(s, allCourses, catalogOwnerId);
          totalDue += due;
          totalCollected += paid;
          if (balance > 0) {
            totalBalance += balance;
            pendingStudents += 1;
          }
        });

        return {
          userId: managedUser.id,
          name: managedUser.fullName || managedUser.email,
          email: managedUser.email,
          studentCount: userStudents.length,
          totalDue,
          totalCollected,
          totalBalance,
          pendingStudents,
          paymentCount: allPayments.filter((p) => p.ownerId === managedUser.id).length,
        };
      });
  }, [managedUsers, filteredStudents, filterUser, allCourses, allPayments, catalogOwnerId]);

  // -------------------------------------------------
  // HELPER FUNCTIONS
  // -------------------------------------------------
  const reloadData = useCallback(async () => {
    await loadManagedUsers(
      userRole,
      user?.uid,
      userProfile?.managedUserIds || [],
      userProfile?.managedBy,
      catalogOwnerId,
    );
  }, [userRole, user?.uid, userProfile, catalogOwnerId]);

  const resolveCourse = (student) => findCourseForStudent(student, allCourses, catalogOwnerId);

  const resolveCohort = (student) => findCohortForStudent(student, allCohorts, catalogOwnerId);

  const getCohortStatus = (cohort) => {
    if (!cohort.startDate || !cohort.endDate) return { text: 'Unknown', color: 'secondary' };
    
    const now = new Date();
    const start = parseISO(cohort.startDate);
    const end = parseISO(cohort.endDate);
    
    if (isBefore(now, start)) return { text: 'Upcoming', color: 'warning' };
    if (isAfter(now, end)) return { text: 'Completed', color: 'secondary' };
    return { text: 'Active', color: 'success' };
  };

  const getOwnerBadgeColor = (ownerType) => {
    switch (ownerType) {
      case 'self': return 'primary';
      case 'managed': return 'success';
      case 'direct': return 'info';
      default: return 'secondary';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'cash': return 'success';
      case 'bank': return 'primary';
      case 'mobile': return 'info';
      default: return 'secondary';
    }
  };

  const getPaymentTypeColor = (type) => {
    switch (type) {
      case 'initial': return 'warning';
      case 'additional': return 'success';
      default: return 'info';
    }
  };

  const getCohortDuration = (cohort) => {
    if (!cohort.startDate || !cohort.endDate) return 'Unknown';
    
    const start = parseISO(cohort.startDate);
    const end = parseISO(cohort.endDate);
    const days = differenceInDays(end, start);
    const weeks = differenceInWeeks(end, start);
    const months = differenceInMonths(end, start);
    
    if (days < 30) return `${days} days`;
    if (weeks < 8) return `${weeks} weeks`;
    return `${months} months`;
  };

  const getCohortProgress = (cohort) => {
    if (!cohort.startDate || !cohort.endDate) return 0;
    
    const now = new Date();
    const start = parseISO(cohort.startDate);
    const end = parseISO(cohort.endDate);
    const totalDuration = end - start;
    const elapsed = now - start;
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // -------------------------------------------------
  // PROGRESS STATS (From Dashboard)
  // -------------------------------------------------
  const progressStats = [
    { 
      // title: 'Total Students', 
      // value: `${filteredStudents.length} (${filteredStudents.length > 0 ? '100.0%' : '0%'})`, 
      // percent: 100, 
      // color: 'success' 
    },
    { 
      // title: 'Active Cohorts', 
      // value: `${allCohorts.filter(c => getCohortStatus(c).text === 'Active').length} (${allCohorts.filter(c => getCohortStatus(c).text === 'Active').length > 0 ? '100.0%' : '0%'})`, 
      // percent: 100, 
      // color: 'info' 
    },
    { 
      // title: 'With Boarding', 
      // value: `${studentsWithBoarding.length} (${filteredStudents.length > 0 ? ((studentsWithBoarding.length / filteredStudents.length) * 100).toFixed(1) + '%' : '0%'})`, 
      // percent: filteredStudents.length > 0 ? (studentsWithBoarding.length / filteredStudents.length) * 100 : 0, 
      // color: 'primary' 
    },
    { 
      // title: 'Collected', 
      // value: formatMK(totalCollected), 
      // percent: 100, 
      // color: 'success' 
    },
    { 
      // title: 'Pending Balance', 
      // value: formatMK(totalBalance), 
      // percent: 100, 
      // color: 'danger' 
    },
  ];

  // -------------------------------------------------
  // MODAL HANDLERS (Teacher role restrictions)
  // -------------------------------------------------
  const openAddStudent = () => {
    if (!requirePermission('create')) return;
    const defaultOwner =
      userRole === 'teacher'
        ? user?.uid || ''
        : studentOwnerOptions[0]?.id || filterUser || user?.uid || '';
    setStudentOwnerId(defaultOwner);
    setStudentForm({
      name: '',
      phoneNumber: '',
      age: '',
      gender: '',
      courseId: '',
      cohortId: '',
      registrationFee: '',
      trainingFee: '',
      boardingFee: '',
      amountPaid: '',
      modeOfPayment: '',
      transId: '',
    });
    setFormErrors({});
    setAddStudentModal(true);
  };

  const openEditStudent = (student) => {
    if (!requirePermission('edit')) return;
    setSelectedStudent(student);
    setStudentForm({
      name: student.name || '',
      phoneNumber: student.phoneNumber || '',
      age: student.age?.toString() || '',
      gender: student.gender || '',
      courseId: student.courseId || '',
      cohortId: student.cohortId || '',
      registrationFee: student.registrationFee?.toString() || '',
      trainingFee: student.trainingFee?.toString() || '',
      boardingFee: student.boardingFee?.toString() || '',
      amountPaid: student.amountPaid?.toString() || '',
      modeOfPayment: student.modeOfPayment || '',
      transId: student.transId || '',
    });
    setEditStudentModal(true);
  };

  const openAddCourse = () => {
    if (!canManageCatalog) {
      showAlert('Only your school admin can create courses. Pick from the shared catalog.', 'warning');
      return;
    }
    if (!requirePermission('create')) return;
    setCourseForm({
      name: '',
      fee: '',
      type: 'weekly',
      weeksOrMonths: '',
      cohortId: '',
      duration: '',
    });
    setAddCourseModal(true);
  };

  const openEditCourse = (course) => {
    if (!canManageCatalog) return;
    if (!requirePermission('edit')) return;
    setSelectedCourse(course);
    setCourseForm({
      name: course.name || '',
      fee: course.fee?.toString() || '',
      type: course.type || 'weekly',
      weeksOrMonths: course.weeksOrMonths?.toString() || '',
      cohortId: course.cohortId || '',
      duration: course.duration || '',
    });
    setEditCourseModal(true);
  };

  const openAddCohort = () => {
    if (!canManageCatalog) {
      showAlert('Only your school admin can create cohorts. Pick from the shared catalog.', 'warning');
      return;
    }
    if (!requirePermission('create')) return;
    setCohortForm({
      name: '',
      startDate: '',
      endDate: '',
      description: '',
      status: 'active',
    });
    setAddCohortModal(true);
  };

  const openEditCohort = (cohort) => {
    if (!canManageCatalog) return;
    if (!requirePermission('edit')) return;
    setSelectedCohort(cohort);
    setCohortForm({
      name: cohort.name || '',
      startDate: cohort.startDate ? format(parseISO(cohort.startDate), 'yyyy-MM-dd') : '',
      endDate: cohort.endDate ? format(parseISO(cohort.endDate), 'yyyy-MM-dd') : '',
      description: cohort.description || '',
      status: cohort.status || 'active',
    });
    setEditCohortModal(true);
  };

  const openEditPayment = (payment) => {
    if (!requirePermission('edit')) return;
    
    if (payment.isInitialPayment) {
      showAlert('Initial payments cannot be edited. Update the student record instead.', 'warning');
      return;
    }
    
    setSelectedPayment(payment);
    setPaymentForm({
      amount: payment.amount?.toString() || '',
      paymentDate: payment.paymentDate?.toDate ? format(payment.paymentDate.toDate(), 'yyyy-MM-dd') : '',
      paymentMethod: payment.paymentMethod || 'cash',
      referenceNumber: payment.referenceNumber || '',
      notes: payment.notes || '',
    });
    setEditPaymentModal(true);
  };

  const openPaymentModal = (student) => {
    if (!requirePermission('create')) return;
    setSelectedStudent(student);
    setNewPaymentForm({
      amount: '',
      paymentMethod: 'cash',
      referenceNumber: '',
      notes: '',
    });
    setFormErrors({});
    setPaymentModal(true);
  };

  const openDeleteConfirm = (item, type) => {
    if (!requirePermission('delete')) return;
    
    if (item.isInitialPayment) {
      showAlert('Initial payments cannot be deleted. Update the student record instead.', 'warning');
      return;
    }
    
    setItemToDelete({ ...item, type });
    setDeleteConfirmModal(true);
  };

  const openPaymentHistory = (student) => {
    setSelectedStudent(student);
    setPaymentHistoryModal(true);
  };

  const openUserStatsModal = (userStat) => {
    setSelectedUserStats(userStat);
    setUserStatsModal(true);
  };

  const openAllPaymentsModal = () => {
    setAllPaymentsModal(true);
    setCurrentPaymentPage(1);
  };

  const openStudentDetailModal = (student) => {
    setSelectedStudent(student);
    setStudentDetailModal(true);
  };

  // -------------------------------------------------
  // CRUD OPERATIONS (Teacher role restrictions)
  // -------------------------------------------------
  const handleAddStudent = async () => {
    if (!requirePermission('create')) return;

    const errors = validateStudent();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      const ownerId =
        userRole === 'teacher' ? user?.uid : studentOwnerId || filterUser || user?.uid;
      if (!ownerId) {
        showAlert('Please select which team member this student belongs to', 'danger');
        return;
      }

      const studentPayload = {
        name: studentForm.name,
        phoneNumber: studentForm.phoneNumber,
        age: parseInt(studentForm.age) || 0,
        gender: studentForm.gender,
        courseId: studentForm.courseId,
        cohortId: studentForm.cohortId,
        catalogOwnerId: catalogOwnerId || user?.uid,
        registrationFee: parseFloat(studentForm.registrationFee) || 0,
        boardingFee: parseFloat(studentForm.boardingFee) || 0,
        amountPaid: parseFloat(studentForm.amountPaid) || 0,
        modeOfPayment: studentForm.modeOfPayment,
        transId: studentForm.transId,
        registrationDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, `users/${ownerId}/students`), studentPayload);

      await reloadData();
      setAddStudentModal(false);
      setFormErrors({});
      showAlert('Student added successfully!');
      notifyCrud('created', 'student', studentForm.name, { workspaceUserId: ownerId });
    } catch (err) {
      console.error('Error adding student:', err);
      showAlert('Error adding student: ' + err.message, 'danger');
    }
  };

  const handleEditStudent = async () => {
    if (!requirePermission('edit')) return;

    if (!selectedStudent) return;

    try {
      const studentRef = doc(db, `users/${selectedStudent.ownerId}/students`, selectedStudent.id);
      await updateDoc(studentRef, {
        name: studentForm.name,
        phoneNumber: studentForm.phoneNumber,
        age: parseInt(studentForm.age) || 0,
        gender: studentForm.gender,
        courseId: studentForm.courseId,
        cohortId: studentForm.cohortId,
        catalogOwnerId: selectedStudent.catalogOwnerId || catalogOwnerId || user?.uid,
        registrationFee: parseFloat(studentForm.registrationFee) || 0,
        boardingFee: parseFloat(studentForm.boardingFee) || 0,
        amountPaid: parseFloat(studentForm.amountPaid) || 0,
        modeOfPayment: studentForm.modeOfPayment,
        transId: studentForm.transId,
        updatedAt: serverTimestamp(),
      });

      await reloadData();
      setEditStudentModal(false);
      showAlert('Student updated successfully!');
      notifyCrud('updated', 'student', studentForm.name, { workspaceUserId: selectedStudent.ownerId });
    } catch (err) {
      console.error('Error updating student:', err);
      showAlert('Error updating student: ' + err.message, 'danger');
    }
  };

  const handleAddCourse = async () => {
    if (!canManageCatalog) {
      showAlert('Only school admins can create courses.', 'warning');
      return;
    }
    if (!requirePermission('create')) return;

    try {
      const ownerId = userRole === 'super-admin' ? (filterUser || user?.uid) : user?.uid;
      if (!ownerId) {
        showAlert('Could not determine catalog owner', 'danger');
        return;
      }

      const coursePayload = {
        name: courseForm.name,
        fee: parseFloat(courseForm.fee) || 0,
        type: courseForm.type,
        weeksOrMonths: parseInt(courseForm.weeksOrMonths) || 0,
        cohortId: courseForm.cohortId,
        duration: courseForm.duration || `${courseForm.weeksOrMonths} ${courseForm.type === 'weekly' ? 'week' : 'month'}${courseForm.weeksOrMonths > 1 ? 's' : ''}`,
        sharedCatalog: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, `users/${ownerId}/courses`), coursePayload);

      await reloadData();
      setAddCourseModal(false);
      showAlert('Course added successfully!');
      notifyCrud('created', 'course', courseForm.name, { workspaceUserId: ownerId });
    } catch (err) {
      console.error('Error adding course:', err);
      showAlert('Error adding course: ' + err.message, 'danger');
    }
  };

  const handleEditCourse = async () => {
    if (!requirePermission('edit')) return;

    if (!selectedCourse) return;

    try {
      const courseRef = doc(db, `users/${selectedCourse.ownerId}/courses`, selectedCourse.id);
      await updateDoc(courseRef, {
        name: courseForm.name,
        fee: parseFloat(courseForm.fee) || 0,
        type: courseForm.type,
        weeksOrMonths: parseInt(courseForm.weeksOrMonths) || 0,
        cohortId: courseForm.cohortId,
        duration: courseForm.duration || `${courseForm.weeksOrMonths} ${courseForm.type === 'weekly' ? 'week' : 'month'}${courseForm.weeksOrMonths > 1 ? 's' : ''}`,
        updatedAt: serverTimestamp(),
      });

      await reloadData();
      setEditCourseModal(false);
      showAlert('Course updated successfully!');
      notifyCrud('updated', 'course', courseForm.name, { workspaceUserId: selectedCourse.ownerId });
    } catch (err) {
      console.error('Error updating course:', err);
      showAlert('Error updating course: ' + err.message, 'danger');
    }
  };

  const handleAddCohort = async () => {
    if (!canManageCatalog) {
      showAlert('Only school admins can create cohorts.', 'warning');
      return;
    }
    if (!requirePermission('create')) return;

    try {
      const ownerId = userRole === 'super-admin' ? (filterUser || user?.uid) : user?.uid;
      if (!ownerId) {
        showAlert('Could not determine catalog owner', 'danger');
        return;
      }

      const cohortPayload = {
        name: cohortForm.name,
        startDate: cohortForm.startDate,
        endDate: cohortForm.endDate,
        description: cohortForm.description,
        status: cohortForm.status,
        sharedCatalog: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, `users/${ownerId}/cohorts`), cohortPayload);

      await reloadData();
      setAddCohortModal(false);
      showAlert('Cohort added successfully!');
      notifyCrud('created', 'cohort', cohortForm.name, { workspaceUserId: ownerId });
    } catch (err) {
      console.error('Error adding cohort:', err);
      showAlert('Error adding cohort: ' + err.message, 'danger');
    }
  };

  const handleEditCohort = async () => {
    if (!requirePermission('edit')) return;

    if (!selectedCohort) return;

    try {
      const cohortRef = doc(db, `users/${selectedCohort.ownerId}/cohorts`, selectedCohort.id);
      await updateDoc(cohortRef, {
        name: cohortForm.name,
        startDate: cohortForm.startDate,
        endDate: cohortForm.endDate,
        description: cohortForm.description,
        status: cohortForm.status,
        updatedAt: serverTimestamp(),
      });

      await reloadData();
      setEditCohortModal(false);
      showAlert('Cohort updated successfully!');
      notifyCrud('updated', 'cohort', cohortForm.name, { workspaceUserId: selectedCohort.ownerId });
    } catch (err) {
      console.error('Error updating cohort:', err);
      showAlert('Error updating cohort: ' + err.message, 'danger');
    }
  };

  const handleEditPayment = async () => {
    if (!requirePermission('edit')) return;

    if (!selectedPayment) return;

    try {
      const paymentRef = doc(db, `users/${selectedPayment.ownerId}/payments`, selectedPayment.id);
      await updateDoc(paymentRef, {
        amount: parseFloat(paymentForm.amount) || 0,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes,
        paymentDate: paymentForm.paymentDate ? serverTimestamp() : selectedPayment.paymentDate,
        updatedAt: serverTimestamp(),
      });

      if (selectedPayment.studentId) {
        const studentPayments = allPayments.filter(p => 
          p.studentId === selectedPayment.studentId && p.ownerId === selectedPayment.ownerId
        );
        const totalPaid = studentPayments.reduce((sum, p) => {
          if (p.id === selectedPayment.id) {
            return sum + parseFloat(paymentForm.amount);
          }
          return sum + (p.amount || 0);
        }, 0);
        
        const studentRef = doc(db, `users/${selectedPayment.ownerId}/students`, selectedPayment.studentId);
        await updateDoc(studentRef, {
          amountPaid: totalPaid,
          updatedAt: serverTimestamp(),
        });
      }

      await reloadData();
      setEditPaymentModal(false);
      showAlert('Payment updated successfully!');
      notifyCrud('updated', 'payment', selectedPayment.studentName || 'Payment', {
        workspaceUserId: selectedPayment.ownerId,
      });
    } catch (err) {
      console.error('Error updating payment:', err);
      showAlert('Error updating payment: ' + err.message, 'danger');
    }
  };

  const handleNewPayment = async () => {
    if (!requirePermission('create')) return;

    if (!selectedStudent) return;

    setFormErrors({});

    const errors = validatePayment();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      const amount = parseFloat(newPaymentForm.amount);
      
      const currentBalance = calcBalance(selectedStudent);
      if (amount > currentBalance) {
        setFormErrors({ 
          amount: `Payment amount (${formatMK(amount)}) exceeds current balance (${formatMK(currentBalance)})` 
        });
        return;
      }

      const paymentPayload = {
        amount: amount,
        paymentMethod: newPaymentForm.paymentMethod,
        referenceNumber: newPaymentForm.referenceNumber || '',
        notes: newPaymentForm.notes || '',
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        courseId: selectedStudent.courseId,
        cohortId: selectedStudent.cohortId,
        paymentDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        transactionType: 'additional',
        status: 'completed',
        recordedBy: user.uid,
      };

      await addDoc(collection(db, `users/${selectedStudent.ownerId}/payments`), paymentPayload);

      const currentPaid = selectedStudent.amountPaid || 0;
      const newPaid = currentPaid + amount;
      
      const studentRef = doc(db, `users/${selectedStudent.ownerId}/students`, selectedStudent.id);
      await updateDoc(studentRef, {
        amountPaid: newPaid,
        lastPaymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewPaymentForm({
        amount: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: '',
      });
      setPaymentModal(false);
      setFormErrors({});
      
      await reloadData();
      showAlert(`Payment of ${formatMK(amount)} recorded successfully for ${selectedStudent.name}!`);
      notifyCrud('created', 'payment', selectedStudent.name, {
        amount,
        workspaceUserId: selectedStudent.ownerId,
      });
    } catch (err) {
      console.error('Error recording payment:', err);
      showAlert('Error recording payment: ' + err.message, 'danger');
    }
  };

  const handleDelete = async () => {
    if (!requirePermission('delete')) return;

    if (!itemToDelete) return;

    if (itemToDelete.isInitialPayment) {
      showAlert('Deletion not allowed for initial payments.', 'warning');
      setDeleteConfirmModal(false);
      return;
    }

    try {
      if (itemToDelete.type === 'student') {
        const studentRef = doc(db, `users/${itemToDelete.ownerId}/students`, itemToDelete.id);
        await deleteDoc(studentRef);

        const studentPayments = allPayments.filter(p => 
          p.studentId === itemToDelete.id && p.ownerId === itemToDelete.ownerId
        );
        const batch = writeBatch(db);
        studentPayments.forEach(payment => {
          const paymentRef = doc(db, `users/${itemToDelete.ownerId}/payments`, payment.id);
          batch.delete(paymentRef);
        });
        await batch.commit();

      } else if (itemToDelete.type === 'course') {
        const courseRef = doc(db, `users/${itemToDelete.ownerId}/courses`, itemToDelete.id);
        await deleteDoc(courseRef);

      } else if (itemToDelete.type === 'cohort') {
        const cohortStudents = allStudents.filter(s => s.cohortId === itemToDelete.id && s.ownerId === itemToDelete.ownerId);
        const cohortCourses = allCourses.filter(c => c.cohortId === itemToDelete.id && c.ownerId === itemToDelete.ownerId);
        
        if (cohortStudents.length > 0 || cohortCourses.length > 0) {
          showAlert('Cannot delete cohort with associated students or courses. Please reassign or delete them first.', 'danger');
          setDeleteConfirmModal(false);
          return;
        }

        const cohortRef = doc(db, `users/${itemToDelete.ownerId}/cohorts`, itemToDelete.id);
        await deleteDoc(cohortRef);

      } else if (itemToDelete.type === 'payment') {
        const paymentRef = doc(db, `users/${itemToDelete.ownerId}/payments`, itemToDelete.id);
        await deleteDoc(paymentRef);

        if (itemToDelete.studentId) {
          const studentPayments = allPayments.filter(p => 
            p.studentId === itemToDelete.studentId && 
            p.ownerId === itemToDelete.ownerId &&
            p.id !== itemToDelete.id
          );
          const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const studentRef = doc(db, `users/${itemToDelete.ownerId}/students`, itemToDelete.studentId);
          await updateDoc(studentRef, {
            amountPaid: totalPaid,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await reloadData();
      setDeleteConfirmModal(false);
      showAlert(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully!`);
      notifyCrud('deleted', itemToDelete.type, itemToDelete.name || itemToDelete.studentName || itemToDelete.type, {
        workspaceUserId: itemToDelete.ownerId,
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      showAlert('Error deleting item: ' + err.message, 'danger');
    }
  };

  // -------------------------------------------------
  // COHORT DETAILS
  // -------------------------------------------------
  const viewCohortDetails = async (cohort) => {
    setSelectedCohort(cohort);
    setSelectedCohortDetails(cohort);

    const baseStudents = allStudents.filter((s) => studentMatchesCohort(s, cohort, catalogOwnerId));
    const students = hasActiveStudentFilters
      ? baseStudents.filter((s) =>
          filteredStudents.some((fs) => fs.id === s.id && fs.ownerId === s.ownerId),
        )
      : baseStudents;
    const courses = allCourses.filter((c) => c.cohortId === cohort.id && c.ownerId === cohort.ownerId);
    
    const cohortPaymentIds = students.map(s => s.id);
    const payments = getAllPaymentsWithInitial.filter(p => 
      cohortPaymentIds.includes(p.studentId) && p.ownerId === cohort.ownerId
    );
    
    setCohortStudents(students);
    setCohortCourses(courses);
    setCohortPayments(payments);
    
    setActiveSection('cohortDetails');
  };

  const backToCohorts = () => {
    setSelectedCohort(null);
    setSelectedCohortDetails(null);
    setCohortStudents([]);
    setCohortCourses([]);
    setCohortPayments([]);
    setActiveSection('cohorts');
  };

  // -------------------------------------------------
  // COHORT STATS
  // -------------------------------------------------
  const cohortStats = useMemo(() => {
    if (!selectedCohortDetails) return null;
    
    const totalCollected = cohortStudents.reduce((sum, student) => sum + (student.amountPaid || 0), 0);
    const totalDue = cohortStudents.reduce((sum, student) => {
      const course = allCourses.find(c => c.id === student.courseId && c.ownerId === student.ownerId);
      return sum + calcTotalDue(student);
    }, 0);
    const totalBalance = totalDue - totalCollected;
    const paidStudents = cohortStudents.filter(s => calcBalance(s) <= 0).length;
    const pendingStudents = cohortStudents.filter(s => calcBalance(s) > 0).length;
    
    return {
      totalStudents: cohortStudents.length,
      totalCourses: cohortCourses.length,
      totalPayments: cohortPayments.length,
      totalCollected,
      totalDue,
      totalBalance,
      paidStudents,
      pendingStudents,
      completionRate: cohortStudents.length > 0 ? Math.round((paidStudents / cohortStudents.length) * 100) : 0,
    };
  }, [selectedCohortDetails, cohortStudents, cohortCourses, cohortPayments, allCourses]);

  // -------------------------------------------------
  // PDF EXPORTS (Updated with Dashboard logic)
  // -------------------------------------------------
  const exportAllStudentsPDF = () => {
    const studentsToExport = hasActiveStudentFilters ? filteredStudents : allStudents;
    try {
      downloadStudentsReport({
        students: studentsToExport,
        courses: allCourses,
        cohorts: allCohorts,
        calcTotalDue,
        calcBalance,
        matchOwner: true,
        schoolName: userProfile?.schoolName || userProfile?.fullName || 'School Dashboard',
        managedUserCount: managedUsers.length,
      });
      showAlert(`Exported ${studentsToExport.length} student${studentsToExport.length !== 1 ? 's' : ''} to PDF`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to export students PDF', 'danger');
    }
  };

  const exportAllPaymentsPDF = () => {
    try {
      downloadPaymentsAudit({
        payments: getAllPaymentsWithInitial,
        includeOwner: true,
        title: 'Complete Payments Audit',
      });
      showAlert(`Exported ${getAllPaymentsWithInitial.length} payment records to PDF`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to export payments PDF', 'danger');
    }
  };

  const generateStudentReceipt = (student) => {
    try {
      const course = allCourses.find((c) => c.id === student.courseId && c.ownerId === student.ownerId);
      const cohort = allCohorts.find((coh) => coh.id === student.cohortId && coh.ownerId === student.ownerId);

      const studentPayments = getAllPaymentsWithInitial
        .filter((p) => p.studentId === student.id && p.ownerId === student.ownerId)
        .sort((a, b) => {
          const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(0);
          const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(0);
          return dateB - dateA;
        });

      downloadStudentReceipt({
        student,
        course,
        cohort,
        payments: studentPayments,
        calcTotalDue,
        extraFields: [['Owner', student.ownerName || 'N/A']],
      });
      showAlert(`Receipt saved for ${student.name}`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to generate receipt', 'danger');
    }
  };

  // -------------------------------------------------
  // LOADING STATE
  // -------------------------------------------------
  if (authLoading || dataLoading) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CSpinner color="primary" />
          <div className="mt-2">
            {authLoading ? 'Verifying access...' : 'Loading all user data...'}
          </div>
        </CCol>
      </CRow>
    );
  }

  if (!subscriptionOk || !['admin', 'super-admin', 'teacher'].includes(userRole)) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CAlert color="danger">
            <CIcon icon={cilWarning} className="me-2" />
            <h4>Access Restricted</h4>
            <p>
              {userRole === 'admin' 
                ? 'Your subscription has expired or is not active. Please renew your subscription to access the admin dashboard.'
                : 'You do not have permission to access this dashboard.'}
            </p>
            <CButton color="primary" onClick={() => navigate('/subscription')}>
              {userRole === 'admin' ? 'Renew Subscription' : 'Return to Dashboard'}
            </CButton>
          </CAlert>
        </CCol>
      </CRow>
    );
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return (
    <>
      <PaymentAuditModal
        visible={allPaymentsModal}
        onClose={() => setAllPaymentsModal(false)}
        payments={getAllPaymentsWithInitial}
        filteredPayments={filteredPayments}
        allStudents={allStudents}
        paymentSearchQuery={paymentSearchQuery}
        setPaymentSearchQuery={setPaymentSearchQuery}
        paymentDateFilter={paymentDateFilter}
        setPaymentDateFilter={setPaymentDateFilter}
        getOwnerBadgeColor={getOwnerBadgeColor}
        getPaymentMethodColor={getPaymentMethodColor}
        getPaymentTypeColor={getPaymentTypeColor}
        calcTotalDue={calcTotalDue}
        calcBalance={calcBalance}
        onExportPdf={exportAllPaymentsPDF}
      />

      {/* Edit Payment Modal (From Dashboard) */}
      <CModal visible={editPaymentModal} onClose={() => setEditPaymentModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Payment Transaction
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Amount (MWK) *</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Payment Date</CFormLabel>
              <CFormInput
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Payment Method *</CFormLabel>
              <CFormSelect
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                disabled={!canEdit}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mobile">Mobile Money</option>
              </CFormSelect>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Reference Number</CFormLabel>
              <CFormInput
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                placeholder="Enter reference number"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Enter payment notes"
                rows={3}
                disabled={!canEdit}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditPaymentModal(false)}>Cancel</CButton>
          {canEdit && (
            <CButton color="primary" onClick={handleEditPayment}>Save Changes</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* New Payment Modal (From Dashboard) */}
      <CModal visible={paymentModal} onClose={() => setPaymentModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilMoney} className="me-2" />
            Record Payment: {selectedStudent?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedStudent && (
            <>
              <CRow className="mb-3">
                <CCol>
                  <strong>Fee Breakdown:</strong>
                  <div className="small">
                    Course: {formatMK(allCourses.find(c => c.id === selectedStudent.courseId && c.ownerId === selectedStudent.ownerId)?.fee || 0)} | 
                    Reg: {formatMK(selectedStudent.registrationFee || 0)} | 
                    Training: {formatMK(getCourseFeeForStudent(selectedStudent, allCourses, catalogOwnerId))} |
                    Boarding: {formatMK(selectedStudent.boardingFee || 0)}
                  </div>
                  <div className="mt-1">
                    <strong>Total Due:</strong> {formatMK(calcTotalDue(selectedStudent))} | 
                    <strong> Paid:</strong> {formatMK(selectedStudent.amountPaid || 0)} | 
                    <strong className={calcBalance(selectedStudent) > 0 ? 'text-danger' : 'text-success'}>
                      {' '}Balance: {formatMK(calcBalance(selectedStudent))}
                    </strong>
                  </div>
                </CCol>
              </CRow>
              <CRow className="g-3">
                <CCol md={12}>
                  <CFormLabel>Amount (MWK) *</CFormLabel>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPaymentForm.amount}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    invalid={!!formErrors.amount}
                    disabled={!canCreate}
                  />
                  {formErrors.amount && <div className="invalid-feedback">{formErrors.amount}</div>}
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Payment Method *</CFormLabel>
                  <CFormSelect
                    value={newPaymentForm.paymentMethod}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, paymentMethod: e.target.value })}
                    invalid={!!formErrors.paymentMethod}
                    disabled={!canCreate}
                  >
                    <option value="">Select Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile Money</option>
                  </CFormSelect>
                  {formErrors.paymentMethod && <div className="invalid-feedback">{formErrors.paymentMethod}</div>}
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Reference Number</CFormLabel>
                  <CFormInput
                    value={newPaymentForm.referenceNumber}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, referenceNumber: e.target.value })}
                    placeholder="Enter reference number (optional)"
                    disabled={!canCreate}
                  />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Notes</CFormLabel>
                  <CFormTextarea
                    value={newPaymentForm.notes}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, notes: e.target.value })}
                    placeholder="Enter payment notes (optional)"
                    rows={3}
                    disabled={!canCreate}
                  />
                </CCol>
              </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => {
            setPaymentModal(false);
            setFormErrors({});
          }}>Cancel</CButton>
          {canCreate && (
            <CButton color="success" onClick={handleNewPayment}>Record Payment</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Payment History Modal (From Dashboard) */}
      <CModal size="lg" visible={paymentHistoryModal} onClose={() => setPaymentHistoryModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilList} className="me-2" />
            Complete Payment History: {selectedStudent?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedStudent && (
            <>
              <CRow className="mb-3">
                <CCol>
                  <strong>Fee Summary:</strong>
                  <div className="small">
                    Course: {formatMK(allCourses.find(c => c.id === selectedStudent.courseId && c.ownerId === selectedStudent.ownerId)?.fee || 0)} | 
                    Reg: {formatMK(selectedStudent.registrationFee || 0)} | 
                    Training: {formatMK(getCourseFeeForStudent(selectedStudent, allCourses, catalogOwnerId))} |
                    Boarding: {formatMK(selectedStudent.boardingFee || 0)}
                  </div>
                  <div>
                    <strong>Total Due:</strong> {formatMK(calcTotalDue(selectedStudent))}
                    {' | '}
                    <strong>Paid:</strong> {formatMK(selectedStudent.amountPaid || 0)}
                    {' | '}
                    <strong>Balance:</strong> 
                    <span className={calcBalance(selectedStudent) > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                      {' '}{formatMK(calcBalance(selectedStudent))}
                    </span>
                  </div>
                </CCol>
              </CRow>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date & Time</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Method</CTableHeaderCell>
                    <CTableHeaderCell>Reference</CTableHeaderCell>
                    <CTableHeaderCell>Notes</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {getAllPaymentsWithInitial
                    .filter(p => p.studentId === selectedStudent.id && p.ownerId === selectedStudent.ownerId)
                    .sort((a, b) => {
                      const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(0);
                      const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(0);
                      return dateB - dateA;
                    })
                    .map(payment => {
                      const paymentDate = payment.paymentDate?.toDate ? format(payment.paymentDate.toDate(), 'dd/MM/yyyy HH:mm') : '—';
                      const paymentType = payment.isInitialPayment ? 'Initial' : (payment.transactionType || 'Additional');
                      return (
                        <CTableRow key={payment.id}>
                          <CTableDataCell>{paymentDate}</CTableDataCell>
                          <CTableDataCell className="fw-bold text-success">
                            {formatMK(payment.amount || 0)}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getPaymentMethodColor(payment.paymentMethod)}>
                              {payment.paymentMethod}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {payment.referenceNumber ? (
                              <strong>{payment.referenceNumber}</strong>
                            ) : (
                              <span className="text-muted">No reference</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>{payment.notes || '—'}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                              {paymentType}
                            </CBadge>
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                </CTableBody>
              </CTable>
              {getAllPaymentsWithInitial.filter(p => p.studentId === selectedStudent.id && p.ownerId === selectedStudent.ownerId).length === 0 && (
                <CAlert color="info" className="text-center">
                  No payment records found for this student.
                </CAlert>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setPaymentHistoryModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Confirmation Modal */}
      <CModal visible={deleteConfirmModal} onClose={() => setDeleteConfirmModal(false)}>
        <CModalHeader>
          <CModalTitle>Confirm Delete</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this {itemToDelete?.type}? 
          {itemToDelete?.type === 'student' && ' This will also delete all associated payments.'}
          {itemToDelete?.type === 'cohort' && ' This action can only be performed if no students or courses are associated with this cohort.'}
          <br /><br />
          <strong>
            {itemToDelete?.name || itemToDelete?.referenceNumber || `ID: ${itemToDelete?.id?.substring(0, 8)}`}
          </strong>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteConfirmModal(false)}>Cancel</CButton>
          {canDelete && (
            <CButton color="danger" onClick={handleDelete}>Delete</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Student Detail Modal */}
      <CModal size="lg" visible={studentDetailModal} onClose={() => setStudentDetailModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilUser} className="me-2" />
            Student Details: {selectedStudent?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedStudent && (
            <>
              <StudentEligibilityBanner
                eligible={isEligibleForEquipmentAndCertificates(
                  selectedStudent,
                  allCohorts.find(
                    (c) => c.id === selectedStudent.cohortId && c.ownerId === selectedStudent.ownerId,
                  ),
                  allCourses,
                  catalogOwnerId,
                )}
                className="mb-3"
              />
            <CRow>
              <CCol md={6}>
                <CListGroup>
                  <CListGroupItem>
                    <strong>Name:</strong> {selectedStudent.name}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Phone:</strong> {selectedStudent.phoneNumber || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Age:</strong> {selectedStudent.age || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Gender:</strong> {selectedStudent.gender || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Owner:</strong> 
                    <CBadge color={getOwnerBadgeColor(selectedStudent.ownerType)} className="ms-2">
                      {selectedStudent.ownerName}
                    </CBadge>
                  </CListGroupItem>
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <CListGroup>
                  <CListGroupItem>
                    <strong>Course:</strong> {allCourses.find(c => c.id === selectedStudent.courseId && c.ownerId === selectedStudent.ownerId)?.name || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Cohort:</strong> {allCohorts.find(c => c.id === selectedStudent.cohortId && c.ownerId === selectedStudent.ownerId)?.name || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Payment Method:</strong> {selectedStudent.modeOfPayment || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Transaction ID:</strong> {selectedStudent.transId || 'N/A'}
                  </CListGroupItem>
                  <CListGroupItem>
                    <strong>Status:</strong>
                    <span className="ms-2">
                      <StudentStatusBadge
                        paid={calcBalance(selectedStudent) <= 0}
                        eligible={isEligibleForEquipmentAndCertificates(
                          selectedStudent,
                          allCohorts.find(
                            (c) =>
                              c.id === selectedStudent.cohortId &&
                              c.ownerId === selectedStudent.ownerId,
                          ),
                          allCourses,
                          catalogOwnerId,
                        )}
                      />
                    </span>
                  </CListGroupItem>
                </CListGroup>
              </CCol>
              <CCol md={12} className="mt-3">
                <CCard>
                  <CCardHeader className="bg-light">
                    <strong>Fee Breakdown</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow>
                      <CCol md={3} className="text-center">
                        <div className="text-body-secondary">Course Fee</div>
                        <div className="fw-bold">{formatMK(allCourses.find(c => c.id === selectedStudent.courseId && c.ownerId === selectedStudent.ownerId)?.fee || 0)}</div>
                      </CCol>
                      <CCol md={3} className="text-center">
                        <div className="text-body-secondary">Registration</div>
                        <div className="fw-bold">{formatMK(selectedStudent.registrationFee || 0)}</div>
                      </CCol>
                      <CCol md={3} className="text-center">
                        <div className="text-body-secondary">Training</div>
                        <div className="fw-bold">{formatMK(getCourseFeeForStudent(selectedStudent, allCourses, catalogOwnerId))}</div>
                      </CCol>
                      <CCol md={3} className="text-center">
                        <div className="text-body-secondary">Boarding</div>
                        <div className="fw-bold">{formatMK(selectedStudent.boardingFee || 0)}</div>
                      </CCol>
                    </CRow>
                    <CRow className="mt-3">
                      <CCol md={4} className="text-center">
                        <div className="text-body-secondary">Total Due</div>
                        <div className="fw-bold text-warning">{formatMK(calcTotalDue(selectedStudent))}</div>
                      </CCol>
                      <CCol md={4} className="text-center">
                        <div className="text-body-secondary">Paid</div>
                        <div className="fw-bold text-success">{formatMK(selectedStudent.amountPaid || 0)}</div>
                      </CCol>
                      <CCol md={4} className="text-center">
                        <div className="text-body-secondary">Balance</div>
                        <div className={`fw-bold ${calcBalance(selectedStudent) > 0 ? 'text-danger' : 'text-success'}`}>
                          {formatMK(calcBalance(selectedStudent))}
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStudentDetailModal(false)}>Close</CButton>
          {canEdit && (
              <CButton color="primary" onClick={() => {
                setStudentDetailModal(false);
                openEditStudent(selectedStudent);
              }}>Edit Student</CButton>
          )}
          {canCreate && (
              <CButton color="success" onClick={() => {
                setStudentDetailModal(false);
                openPaymentModal(selectedStudent);
              }}>Record Payment</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Add Student Modal */}
      <CModal size="lg" visible={addStudentModal} onClose={() => setAddStudentModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPlus} className="me-2" />
            Add New Student
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel>Full Name *</CFormLabel>
              <CFormInput
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Enter full name"
                invalid={!!formErrors.name}
                disabled={!canCreate}
              />
              {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Phone Number</CFormLabel>
              <CFormInput
                value={studentForm.phoneNumber}
                onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                placeholder="Enter 10-digit phone number"
                invalid={!!formErrors.phoneNumber}
                disabled={!canCreate}
              />
              {formErrors.phoneNumber && <div className="invalid-feedback">{formErrors.phoneNumber}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Age *</CFormLabel>
              <CFormInput
                type="number"
                value={studentForm.age}
                onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })}
                placeholder="Age"
                invalid={!!formErrors.age}
                disabled={!canCreate}
              />
              {formErrors.age && <div className="invalid-feedback">{formErrors.age}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Gender *</CFormLabel>
              <CFormSelect
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                invalid={!!formErrors.gender}
                disabled={!canCreate}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </CFormSelect>
              {formErrors.gender && <div className="invalid-feedback">{formErrors.gender}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Owner *</CFormLabel>
              {userRole === 'teacher' ? (
                <>
                  <CFormInput
                    value={userProfile?.fullName || user?.email || 'You'}
                    disabled
                  />
                  <div className="form-text">Students are registered under your account</div>
                </>
              ) : (
                <>
                  <CFormSelect
                    value={studentOwnerId}
                    onChange={(e) => setStudentOwnerId(e.target.value)}
                    disabled={!canCreate}
                  >
                    <option value="">Select team member</option>
                    {studentOwnerOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.email}
                        {u.role ? ` (${u.role})` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                  <div className="form-text">Assign this student to a coordinator on your team</div>
                </>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Course *</CFormLabel>
              <CFormSelect
                value={studentForm.courseId}
                onChange={(e) => setStudentForm((f) => applyCourseToStudentForm(e.target.value, f))}
                invalid={!!formErrors.courseId}
                disabled={!canCreate}
              >
                <option value="">Select Course</option>
                {catalogCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {formatMK(c.fee)}</option>
                ))}
              </CFormSelect>
              {formErrors.courseId && <div className="invalid-feedback">{formErrors.courseId}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Cohort *</CFormLabel>
              <CFormSelect
                value={studentForm.cohortId}
                onChange={(e) => setStudentForm({ ...studentForm, cohortId: e.target.value })}
                invalid={!!formErrors.cohortId}
                disabled={!canCreate}
              >
                <option value="">Select Cohort</option>
                {catalogCohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CFormSelect>
              {formErrors.cohortId && <div className="invalid-feedback">{formErrors.cohortId}</div>}
            </CCol>
            <CCol md={3}>
              <CFormLabel>Registration Fee (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.registrationFee}
                onChange={(e) => setStudentForm({ ...studentForm, registrationFee: e.target.value })}
                placeholder="0.00"
                invalid={!!formErrors.registrationFee}
                disabled={!canCreate}
              />
              {formErrors.registrationFee && <div className="invalid-feedback">{formErrors.registrationFee}</div>}
            </CCol>
            <CCol md={3}>
              <CFormLabel>Training Fee (MWK)</CFormLabel>
              <CFormInput
                value={formCourseFee != null ? formatMK(formCourseFee) : 'Select a course first'}
                disabled
                readOnly
                className="bg-body-secondary"
              />
              <div className="form-text">Course fee from catalog (not editable)</div>
            </CCol>
            <CCol md={3}>
              <CFormLabel>Boarding Fee (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.boardingFee}
                onChange={(e) => setStudentForm({ ...studentForm, boardingFee: e.target.value })}
                placeholder="0.00"
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Initial Payment (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.amountPaid}
                onChange={(e) => setStudentForm({ ...studentForm, amountPaid: e.target.value })}
                placeholder="0.00"
                invalid={!!formErrors.amountPaid}
                disabled={!canCreate}
              />
              {formErrors.amountPaid && <div className="invalid-feedback">{formErrors.amountPaid}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Payment Method</CFormLabel>
              <CFormSelect
                value={studentForm.modeOfPayment}
                onChange={(e) => setStudentForm({ ...studentForm, modeOfPayment: e.target.value })}
                disabled={!canCreate}
              >
                <option value="">Select Method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Transaction/Reference ID</CFormLabel>
              <CFormInput
                value={studentForm.transId}
                onChange={(e) => setStudentForm({ ...studentForm, transId: e.target.value })}
                placeholder="Enter transaction/reference ID"
                disabled={!canCreate}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAddStudentModal(false)}>Cancel</CButton>
          {canCreate && (
            <CButton color="primary" onClick={handleAddStudent}>Add Student</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Edit Student Modal */}
      <CModal size="lg" visible={editStudentModal} onClose={() => setEditStudentModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Student: {selectedStudent?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel>Full Name *</CFormLabel>
              <CFormInput
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Enter full name"
                invalid={!!formErrors.name}
                disabled={!canEdit}
              />
              {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Phone Number</CFormLabel>
              <CFormInput
                value={studentForm.phoneNumber}
                onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                placeholder="Enter 10-digit phone number"
                invalid={!!formErrors.phoneNumber}
                disabled={!canEdit}
              />
              {formErrors.phoneNumber && <div className="invalid-feedback">{formErrors.phoneNumber}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Age *</CFormLabel>
              <CFormInput
                type="number"
                value={studentForm.age}
                onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })}
                placeholder="Age"
                invalid={!!formErrors.age}
                disabled={!canEdit}
              />
              {formErrors.age && <div className="invalid-feedback">{formErrors.age}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Gender *</CFormLabel>
              <CFormSelect
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                invalid={!!formErrors.gender}
                disabled={!canEdit}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </CFormSelect>
              {formErrors.gender && <div className="invalid-feedback">{formErrors.gender}</div>}
            </CCol>
            <CCol md={4}>
              <CFormLabel>Owner</CFormLabel>
              <CFormInput
                value={selectedStudent?.ownerName || 'N/A'}
                disabled
              />
              <div className="form-text">Cannot change owner</div>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Course *</CFormLabel>
              <CFormSelect
                value={studentForm.courseId}
                onChange={(e) => setStudentForm((f) => applyCourseToStudentForm(e.target.value, f))}
                invalid={!!formErrors.courseId}
                disabled={!canEdit}
              >
                <option value="">Select Course</option>
                {catalogCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {formatMK(c.fee)}</option>
                ))}
              </CFormSelect>
              {formErrors.courseId && <div className="invalid-feedback">{formErrors.courseId}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Cohort *</CFormLabel>
              <CFormSelect
                value={studentForm.cohortId}
                onChange={(e) => setStudentForm({ ...studentForm, cohortId: e.target.value })}
                invalid={!!formErrors.cohortId}
                disabled={!canEdit}
              >
                <option value="">Select Cohort</option>
                {catalogCohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CFormSelect>
              {formErrors.cohortId && <div className="invalid-feedback">{formErrors.cohortId}</div>}
            </CCol>
            <CCol md={3}>
              <CFormLabel>Registration Fee (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.registrationFee}
                onChange={(e) => setStudentForm({ ...studentForm, registrationFee: e.target.value })}
                placeholder="0.00"
                invalid={!!formErrors.registrationFee}
                disabled={!canEdit}
              />
              {formErrors.registrationFee && <div className="invalid-feedback">{formErrors.registrationFee}</div>}
            </CCol>
            <CCol md={3}>
              <CFormLabel>Training Fee (MWK)</CFormLabel>
              <CFormInput
                value={formCourseFee != null ? formatMK(formCourseFee) : 'Select a course first'}
                disabled
                readOnly
                className="bg-body-secondary"
              />
              <div className="form-text">Course fee from catalog (not editable)</div>
            </CCol>
            <CCol md={3}>
              <CFormLabel>Boarding Fee (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.boardingFee}
                onChange={(e) => setStudentForm({ ...studentForm, boardingFee: e.target.value })}
                placeholder="0.00"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Total Paid (MWK)</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={studentForm.amountPaid}
                onChange={(e) => setStudentForm({ ...studentForm, amountPaid: e.target.value })}
                placeholder="0.00"
                invalid={!!formErrors.amountPaid}
                disabled={!canEdit}
              />
              {formErrors.amountPaid && <div className="invalid-feedback">{formErrors.amountPaid}</div>}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Payment Method</CFormLabel>
              <CFormSelect
                value={studentForm.modeOfPayment}
                onChange={(e) => setStudentForm({ ...studentForm, modeOfPayment: e.target.value })}
                disabled={!canEdit}
              >
                <option value="">Select Method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Transaction/Reference ID</CFormLabel>
              <CFormInput
                value={studentForm.transId}
                onChange={(e) => setStudentForm({ ...studentForm, transId: e.target.value })}
                placeholder="Enter transaction/reference ID"
                disabled={!canEdit}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditStudentModal(false)}>Cancel</CButton>
          {canEdit && (
            <CButton color="primary" onClick={handleEditStudent}>Update Student</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Add Course Modal */}
      <CModal visible={addCourseModal} onClose={() => setAddCourseModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPlus} className="me-2" />
            Add New Course
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Course Name *</CFormLabel>
              <CFormInput
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                placeholder="Enter course name"
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Course Fee (MWK) *</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={courseForm.fee}
                onChange={(e) => setCourseForm({ ...courseForm, fee: e.target.value })}
                placeholder="0.00"
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Course Type *</CFormLabel>
              <CFormSelect
                value={courseForm.type}
                onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                disabled={!canCreate}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Duration (Weeks/Months) *</CFormLabel>
              <CFormInput
                type="number"
                value={courseForm.weeksOrMonths}
                onChange={(e) => setCourseForm({ ...courseForm, weeksOrMonths: e.target.value })}
                placeholder={`Number of ${courseForm.type === 'weekly' ? 'weeks' : 'months'}`}
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Associated Cohort</CFormLabel>
              <CFormSelect
                value={courseForm.cohortId}
                onChange={(e) => setCourseForm({ ...courseForm, cohortId: e.target.value })}
                disabled={!canCreate}
              >
                <option value="">Select Cohort (Optional)</option>
                {catalogCohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CFormSelect>
            </CCol>
            {userRole === 'super-admin' && (
            <CCol md={12}>
              <CFormLabel>School admin catalog *</CFormLabel>
              <CFormSelect
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                disabled={!canCreate}
              >
                <option value="">Select admin catalog</option>
                {managedUsers.filter(u => u.role === 'admin' || u.role === 'super-admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </CFormSelect>
              <div className="form-text">Courses are stored in the selected admin&apos;s shared catalog.</div>
            </CCol>
            )}
            {canManageCatalog && userRole === 'admin' && (
            <CCol md={12}>
              <CAlert color="info" className="mb-0 py-2 small">
                Added to your school catalog — coordinators pick from this list when enrolling students.
              </CAlert>
            </CCol>
            )}
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAddCourseModal(false)}>Cancel</CButton>
          {canManageCatalog && canCreate && (
            <CButton color="primary" onClick={handleAddCourse}>Add Course</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Edit Course Modal */}
      <CModal visible={editCourseModal} onClose={() => setEditCourseModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Course: {selectedCourse?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Course Name *</CFormLabel>
              <CFormInput
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                placeholder="Enter course name"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Course Fee (MWK) *</CFormLabel>
              <CFormInput
                type="number"
                step="0.01"
                value={courseForm.fee}
                onChange={(e) => setCourseForm({ ...courseForm, fee: e.target.value })}
                placeholder="0.00"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Course Type *</CFormLabel>
              <CFormSelect
                value={courseForm.type}
                onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
                disabled={!canEdit}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Duration (Weeks/Months) *</CFormLabel>
              <CFormInput
                type="number"
                value={courseForm.weeksOrMonths}
                onChange={(e) => setCourseForm({ ...courseForm, weeksOrMonths: e.target.value })}
                placeholder={`Number of ${courseForm.type === 'weekly' ? 'weeks' : 'months'}`}
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Associated Cohort</CFormLabel>
              <CFormSelect
                value={courseForm.cohortId}
                onChange={(e) => setCourseForm({ ...courseForm, cohortId: e.target.value })}
                disabled={!canEdit}
              >
                <option value="">Select Cohort (Optional)</option>
                {allCohorts.filter(c => c.ownerId === selectedCourse?.ownerId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Owner</CFormLabel>
              <CFormInput
                value={selectedCourse?.ownerName || 'N/A'}
                disabled
              />
              <div className="form-text">Cannot change owner</div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditCourseModal(false)}>Cancel</CButton>
          {canManageCatalog && canEdit && (
            <CButton color="primary" onClick={handleEditCourse}>Update Course</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Add Cohort Modal */}
      <CModal visible={addCohortModal} onClose={() => setAddCohortModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPlus} className="me-2" />
            Add New Cohort
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Cohort Name *</CFormLabel>
              <CFormInput
                value={cohortForm.name}
                onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                placeholder="Enter cohort name"
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Start Date *</CFormLabel>
              <CFormInput
                type="date"
                value={cohortForm.startDate}
                onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>End Date *</CFormLabel>
              <CFormInput
                type="date"
                value={cohortForm.endDate}
                onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })}
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                value={cohortForm.description}
                onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
                placeholder="Enter cohort description"
                rows={3}
                disabled={!canCreate}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Status</CFormLabel>
              <CFormSelect
                value={cohortForm.status}
                onChange={(e) => setCohortForm({ ...cohortForm, status: e.target.value })}
                disabled={!canCreate}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </CFormSelect>
            </CCol>
            {userRole === 'super-admin' && (
            <CCol md={6}>
              <CFormLabel>School admin catalog *</CFormLabel>
              <CFormSelect
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                disabled={!canCreate}
              >
                <option value="">Select admin catalog</option>
                {managedUsers.filter(u => u.role === 'admin' || u.role === 'super-admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            )}
            {canManageCatalog && userRole === 'admin' && (
            <CCol md={12}>
              <CAlert color="info" className="mb-0 py-2 small">
                Added to your school catalog — all coordinators share this cohort list.
              </CAlert>
            </CCol>
            )}
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAddCohortModal(false)}>Cancel</CButton>
          {canManageCatalog && canCreate && (
            <CButton color="primary" onClick={handleAddCohort}>Add Cohort</CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Edit Cohort Modal */}
      <CModal visible={editCohortModal} onClose={() => setEditCohortModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Cohort: {selectedCohort?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Cohort Name *</CFormLabel>
              <CFormInput
                value={cohortForm.name}
                onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                placeholder="Enter cohort name"
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Start Date *</CFormLabel>
              <CFormInput
                type="date"
                value={cohortForm.startDate}
                onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>End Date *</CFormLabel>
              <CFormInput
                type="date"
                value={cohortForm.endDate}
                onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })}
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                value={cohortForm.description}
                onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
                placeholder="Enter cohort description"
                rows={3}
                disabled={!canEdit}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Status</CFormLabel>
              <CFormSelect
                value={cohortForm.status}
                onChange={(e) => setCohortForm({ ...cohortForm, status: e.target.value })}
                disabled={!canEdit}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Owner</CFormLabel>
              <CFormInput
                value={selectedCohort?.ownerName || 'N/A'}
                disabled
              />
              <div className="form-text">Cannot change owner</div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditCohortModal(false)}>Cancel</CButton>
          {canManageCatalog && canEdit && (
            <CButton color="primary" onClick={handleEditCohort}>Update Cohort</CButton>
          )}
        </CModalFooter>
      </CModal>

      <UserStatsModal
        visible={userStatsModal}
        onClose={() => setUserStatsModal(false)}
        user={selectedUserStats}
        getOwnerBadgeColor={getOwnerBadgeColor}
      />

      {/* Search & Filters — hidden on cohort workspace for a cleaner focus */}
      {activeSection !== 'cohortDetails' && (
      <CRow className="mb-3">
        <CCol md={6}>
          <CInputGroup>
            <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
            <CFormInput 
              placeholder="Search students, courses, owners, IDs… (any word order)" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </CInputGroup>
        </CCol>
        <CCol md={6}>
          <CRow className="g-2">
            <CCol xs={6} md={4}>
              <CFormSelect value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                <option value="">All Users</option>
                {managedUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} {u.id === user?.uid && '(You)'}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={4}>
              <CFormSelect value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)}>
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={4}>
              <CFormSelect value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCol>
      </CRow>
      )}

      {activeSection !== 'cohortDetails' && hasActiveStudentFilters && (
        <CAlert color="info" className="py-2 mb-3 sms-filter-summary">
          Showing <strong>{filteredStudents.length}</strong> of{' '}
          <strong>{filteredStudentsByDate.length}</strong> students in this {dateFilter.toLowerCase()} view
          {displayCohorts.length !== filteredCohorts.length && (
            <> · <strong>{displayCohorts.length}</strong> matching cohort{displayCohorts.length !== 1 ? 's' : ''}</>
          )}
          {displayCourses.length !== filteredCourses.length && (
            <> · <strong>{displayCourses.length}</strong> matching course{displayCourses.length !== 1 ? 's' : ''}</>
          )}
        </CAlert>
      )}

      {/* Action Buttons */}
      {activeSection !== 'cohortDetails' && (
      <div className="sms-action-bar">
        {canEdit && (
          <CButton color="primary" variant="outline" onClick={exportAllStudentsPDF}>
            <CIcon icon={cilCloudDownload} className="me-1" /> Export Students ({hasActiveStudentFilters ? filteredStudents.length : allStudents.length})
          </CButton>
        )}
        <CButton color="success" onClick={openAllPaymentsModal}>
          <CIcon icon={cilList} className="me-1" /> Payment Audit ({getAllPaymentsWithInitial.length})
        </CButton>
        {canCreate && (
          <CButton color="primary" onClick={() => openAddStudent()}>
            <CIcon icon={cilPlus} className="me-1" /> Add Student
          </CButton>
        )}
        {canManageCatalog && canCreate && (
          <>
            <CButton color="primary" onClick={() => openAddCourse()}>
              <CIcon icon={cilPlus} className="me-1" /> Add Course
            </CButton>
            <CButton color="info" onClick={() => openAddCohort()}>
              <CIcon icon={cilPlus} className="me-1" /> Add Cohort
            </CButton>
          </>
        )}
      </div>
      )}

      {activeSection !== 'cohortDetails' && (
        <DailyMomentum className="mb-3" />
      )}

      {userRole === 'teacher' && (
        <CAlert color="info" className="mb-3">
          Courses and cohorts are set by your school admin. Use the shared catalog when enrolling students — you cannot create duplicate programmes.
        </CAlert>
      )}

      {/* Navigation Tabs */}
      <CNav variant="tabs" className="sms-section-tabs">
        <CNavItem>
          <CNavLink
            active={activeSection === 'overview'}
            onClick={() => setActiveSection('overview')}
          >
            <CIcon icon={cilChart} className="me-2" />
            Overview
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeSection === 'cohorts'}
            onClick={() => setActiveSection('cohorts')}
          >
            <CIcon icon={cilCalendar} className="me-2" />
            Cohorts ({hasActiveStudentFilters ? displayCohorts.length : allCohorts.length})
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeSection === 'courses'}
            onClick={() => setActiveSection('courses')}
          >
            <CIcon icon={cilBook} className="me-2" />
            Courses ({hasActiveStudentFilters ? displayCourses.length : allCourses.length})
          </CNavLink>
        </CNavItem>
        {activeSection === 'cohortDetails' && selectedCohortDetails && (
          <CNavItem>
            <CNavLink active>
              <CIcon icon={cilPeople} className="me-2" />
              {selectedCohortDetails.name}
            </CNavLink>
          </CNavItem>
        )}
      </CNav>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <>
          <SectionGuide section="overview" />
          <SchoolOverviewPanel
            canEdit={canEdit}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            exportAllStudentsPDF={exportAllStudentsPDF}
            teamFinance={teamFinance}
            filteredStudentCount={filteredStudents.length}
            totalStudentCount={filteredStudentsByDate.length}
            hasActiveStudentFilters={hasActiveStudentFilters}
            allCohorts={displayCohorts}
            allCourses={displayCourses}
            catalogOwnerId={catalogOwnerId}
            paymentCount={getAllPaymentsWithInitial.length}
          />
        </>
      )}

      {activeSection === 'cohorts' && (
        <CohortsPanel
          filteredCohorts={displayCohorts}
          allCourses={allCourses}
          allStudents={filteredStudents}
          filtersActive={hasActiveStudentFilters}
          catalogOwnerId={catalogOwnerId}
          canManageCatalog={canManageCatalog}
          canEdit={canEdit}
          canDelete={canDelete}
          studentMatchesCohort={(s, c) => studentMatchesCohort(s, c, catalogOwnerId)}
          getCohortStatus={getCohortStatus}
          getCohortProgress={getCohortProgress}
          getCohortDuration={getCohortDuration}
          getOwnerBadgeColor={getOwnerBadgeColor}
          viewCohortDetails={viewCohortDetails}
          openEditCohort={openEditCohort}
          openDeleteConfirm={openDeleteConfirm}
          exportAllStudentsPDF={exportAllStudentsPDF}
        />
      )}

      {activeSection === 'cohortDetails' && selectedCohortDetails && cohortStats && (
        <CohortDetailPanel
          selectedCohortDetails={selectedCohortDetails}
          cohortStats={cohortStats}
          cohortStudents={cohortStudents}
          cohortCourses={cohortCourses}
          cohortPayments={cohortPayments}
          allCourses={allCourses}
          getAllPaymentsWithInitial={getAllPaymentsWithInitial}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          formatMK={formatMK}
          calcBalance={calcBalance}
          getCohortStatus={getCohortStatus}
          getCohortProgress={getCohortProgress}
          getCohortDuration={getCohortDuration}
          getOwnerBadgeColor={getOwnerBadgeColor}
          getPaymentMethodColor={getPaymentMethodColor}
          getPaymentTypeColor={getPaymentTypeColor}
          backToCohorts={backToCohorts}
          openStudentDetailModal={openStudentDetailModal}
          openEditStudent={openEditStudent}
          openPaymentModal={openPaymentModal}
          openPaymentHistory={openPaymentHistory}
          generateStudentReceipt={generateStudentReceipt}
          openEditCourse={openEditCourse}
          openDeleteConfirm={openDeleteConfirm}
          openAllPaymentsModal={openAllPaymentsModal}
        />
      )}

      {activeSection === 'courses' && (
        <CoursesPanel
          filteredCourses={displayCourses}
          allStudents={filteredStudents}
          filtersActive={hasActiveStudentFilters}
          catalogOwnerId={catalogOwnerId}
          canManageCatalog={canManageCatalog}
          canEdit={canEdit}
          canDelete={canDelete}
          studentMatchesCourse={(s, c) => studentMatchesCourse(s, c, catalogOwnerId)}
          formatMK={formatMK}
          getOwnerBadgeColor={getOwnerBadgeColor}
          openEditCourse={openEditCourse}
          openDeleteConfirm={openDeleteConfirm}
        />
      )}
    </>
  );
};

export default SchoolDashboard;