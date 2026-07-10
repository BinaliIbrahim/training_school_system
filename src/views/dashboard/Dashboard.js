// src/views/dashboard/Dashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
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
  CAlert,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CPagination,
  CPaginationItem,
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
  cilDollar,
  cilPlus,
  cilList,
  cilOptions,
  cilArrowRight,
  cilArrowLeft,
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
  orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
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
  differenceInWeeks,
  differenceInMonths,
} from 'date-fns';
import {
  downloadFeeStatement,
  downloadPaymentsAudit,
  downloadStudentReceipt,
} from '../../utils/pdfReports';
import CoordinatorDashboardView from '../../components/dashboard/CoordinatorDashboardView';
import { canUserCreate, canUserEdit, canUserDelete, COORDINATOR_PERMISSIONS, permissionsSummary, permissionBlockReason } from '../../utils/permissions';
import { notifyCrud } from '../../utils/notifications';
import { useAppToast } from '../../hooks/useAppToast';

// -------------------------------------------------
// Currency formatter (MWK)
const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
  }).format(amount);

// -------------------------------------------------
const Dashboard = () => {
  const navigate = useNavigate();

  // ---------- Auth & Subscription ----------
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [subscriptionOk, setSubscriptionOk] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ---------- Firestore data ----------
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  // ---------- Modals ----------
  const [studentModal, setStudentModal] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [cohortModal, setCohortModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [editPaymentModal, setEditPaymentModal] = useState(false);
  const [paymentHistoryModal, setPaymentHistoryModal] = useState(false);
  const [allPaymentsModal, setAllPaymentsModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingCohortId, setEditingCohortId] = useState(null);

  // ---------- Forms ----------
  const [studentForm, setStudentForm] = useState({
    name: '',
    courseId: '',
    cohortId: '',
    age: '',
    gender: '',
    registrationFee: '',
    trainingFee: '',
    boardingFee: '',
    amountPaid: '',
    phoneNumber: '',
    modeOfPayment: '',
    transId: '',
  });
  const [courseForm, setCourseForm] = useState({
    name: '',
    fee: '',
    type: 'weekly',
    weeksOrMonths: '',
    cohortId: '',
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
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [newPaymentForm, setNewPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // ---------- Search & Filters ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterCohort, setFilterCohort] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentDateFilter, setPaymentDateFilter] = useState('all');

  // ---------- Pagination ----------
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const paymentsPerPage = 10;

  // ---------- Alerts ----------
  const [activeSection, setActiveSection] = useState('overview');
  const appToast = useAppToast();

  const canCreate = useMemo(() => canUserCreate(userProfile), [userProfile]);
  const canEdit = useMemo(() => canUserEdit(userProfile), [userProfile]);
  const canDelete = useMemo(() => canUserDelete(userProfile), [userProfile]);

  const permissionDeniedMsg =
    'Firestore blocked this write. In Firebase Console → Firestore → Rules, paste your local firestore.rules file and click Publish. Then sign out and sign in.';

  const permissionBlock = useMemo(() => permissionBlockReason(userProfile), [userProfile]);

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

  // -------------------------------------------------
  // 1. AUTH + ROLE + SUBSCRIPTION CHECK - UPDATED
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

        let data = snap.data();

        // Legacy accounts missing permissions — bootstrap once (admin/super-admin can revoke)
        if (!data.permissions && !['admin', 'super-admin'].includes(data.role)) {
          try {
            await updateDoc(userRef, {
              permissions: { ...COORDINATOR_PERMISSIONS },
              canWrite: true,
            });
            data = { ...data, permissions: { ...COORDINATOR_PERMISSIONS }, canWrite: true };
          } catch (_) {
            /* requires updated firestore.rules to be published */
          }
        } else if (
          data.permissions?.create === true &&
          data.canWrite !== true &&
          !['admin', 'super-admin'].includes(data.role)
        ) {
          try {
            await updateDoc(userRef, { canWrite: true });
            data = { ...data, canWrite: true };
          } catch (_) {
            /* super-admin must re-save permissions or publish rules */
          }
        }

        setUserProfile(data);
        setUserRole(data.role || 'student');

        // Check if user is coordinator/admin - redirect if not
        if (!['student', 'admin', 'super-admin'].includes(data.role)) {
          alert('Access denied. This dashboard is for Coordinators only.');
          navigate('/login');
          return;
        }

        if (!data.subscriptionenddate) {
          const msg = data.hasUsedTrial
            ? 'No active subscription. Subscribe to access the system.'
            : 'No active subscription. Start a 3-day free trial or subscribe.';
          alert(msg);
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

        setSubscriptionOk(true);
      } catch (err) {
        console.error('Subscription error:', err);
        alert('Failed to verify subscription: ' + err.message);
        navigate('/login');
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // Live permission updates when admin changes access in Manage Users
  useEffect(() => {
    if (!user?.uid || !subscriptionOk) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });
    return () => unsub();
  }, [user?.uid, subscriptionOk]);

  // -------------------------------------------------
  // 2. LISTEN TO USER-SPECIFIC DATA - UPDATED
  // -------------------------------------------------
  useEffect(() => {
    if (!user || !subscriptionOk) return;
    if (!['student', 'admin', 'super-admin'].includes(userRole)) return;

    const uid = user.uid;

    const studentsCol = collection(db, `users/${uid}/students`);
    const coursesCol = collection(db, `users/${uid}/courses`);
    const cohortsCol = collection(db, `users/${uid}/cohorts`);
    const paymentsCol = collection(db, `users/${uid}/payments`);

    const qStudents = query(studentsCol);
    const qCourses = query(coursesCol);
    const qCohorts = query(cohortsCol);
    const qPayments = query(paymentsCol, orderBy('paymentDate', 'desc'));

    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudents(list);
    }, (error) => {
      console.error('Error loading students:', error);
      showAlert('Error loading students: ' + error.message, 'danger');
    });

    const unsubCourses = onSnapshot(qCourses, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCourses(list);
    }, (error) => {
      console.error('Error loading courses:', error);
      showAlert('Error loading courses: ' + error.message, 'danger');
    });

    const unsubCohorts = onSnapshot(qCohorts, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCohorts(list);
    }, (error) => {
      console.error('Error loading cohorts:', error);
      showAlert('Error loading cohorts: ' + error.message, 'danger');
    });

    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPayments(list);
      setDataLoading(false);
    }, (error) => {
      console.error('Error loading payments:', error);
      showAlert('Error loading payments: ' + error.message, 'danger');
    });

    return () => {
      unsubStudents();
      unsubCourses();
      unsubCohorts();
      unsubPayments();
    };
  }, [user, subscriptionOk, userRole]);

  // -------------------------------------------------
  // 3. DATE FILTER LOGIC - UPDATED WITH "ALL"
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
      case 'All':
      default:
        return { start: new Date(0), end: new Date(8640000000000000) }; // All time
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  const filteredStudentsByDate = useMemo(() => {
    return students.filter((s) => {
      if (!s.registrationDate) return true; // Include if no date
      try {
        const regDate = s.registrationDate?.toDate ? s.registrationDate.toDate() : new Date(s.registrationDate);
        if (isNaN(regDate.getTime())) return true; // Include if invalid date
        return isWithinInterval(regDate, { start: rangeStart, end: rangeEnd });
      } catch (error) {
        console.error('Error parsing date for student:', s.id, error);
        return true; // Include on error
      }
    });
  }, [students, dateFilter, rangeStart, rangeEnd]);

  // -------------------------------------------------
  // 4. TOTALS (Filtered) - UPDATED
  // -------------------------------------------------
  useEffect(() => {
    let collected = 0;
    let balance = 0;

    filteredStudentsByDate.forEach((s) => {
      const course = courses.find((c) => c.id === s.courseId);
      const totalDue =
        (course?.fee || 0) +
        (s.registrationFee || 0) +
        (s.trainingFee || 0) +
        (s.boardingFee || 0);
      const paid = s.amountPaid || 0;
      collected += paid;
      balance += totalDue - paid;
    });

    setTotalCollected(collected);
    setTotalBalance(balance);
  }, [filteredStudentsByDate, courses]);

  // -------------------------------------------------
  // 5. FILTERED DATA - UPDATED
  // -------------------------------------------------
  const filteredCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [cohorts, searchQuery]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCohort = !filterCohort || c.cohortId === filterCohort;
      return matchesSearch && matchesCohort;
    });
  }, [courses, searchQuery, filterCohort]);

  const filteredStudents = useMemo(() => {
    return filteredStudentsByDate.filter((s) => {
      const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesCourse = !filterCourse || s.courseId === filterCourse;
      const matchesCohort = !filterCohort || s.cohortId === filterCohort;
      return matchesSearch && matchesCourse && matchesCohort;
    });
  }, [filteredStudentsByDate, searchQuery, filterCourse, filterCohort]);

  // Enhanced payment filtering
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (paymentSearchQuery) {
      filtered = filtered.filter(p => 
        p.studentName?.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
        p.referenceNumber?.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
        p.paymentMethod?.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
        p.notes?.toLowerCase().includes(paymentSearchQuery.toLowerCase())
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
        default:
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter(p => {
          if (!p.paymentDate) return false;
          try {
            const paymentDate = p.paymentDate?.toDate ? p.paymentDate.toDate() : new Date(p.paymentDate);
            return isWithinInterval(paymentDate, { start: startDate, end: endDate });
          } catch (error) {
            return false;
          }
        });
      }
    }

    return filtered;
  }, [payments, paymentSearchQuery, paymentDateFilter]);

  // Get combined payments including initial student payments
  const getAllPaymentsWithInitial = useMemo(() => {
    const allPayments = [...filteredPayments];
    
    filteredStudents.forEach(student => {
      if (student.amountPaid > 0) {
        allPayments.push({
          id: `initial-${student.id}`,
          amount: student.amountPaid,
          paymentMethod: student.modeOfPayment || 'initial',
          referenceNumber: student.transId || 'INITIAL',
          notes: 'Initial payment at registration',
          studentId: student.id,
          studentName: student.name,
          courseId: student.courseId,
          cohortId: student.cohortId,
          paymentDate: student.registrationDate,
          transactionType: 'initial',
          isInitialPayment: true
        });
      }
    });

    return allPayments.sort((a, b) => {
      try {
        const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
        const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
        return dateB - dateA;
      } catch {
        return 0;
      }
    });
  }, [filteredPayments, filteredStudents]);

  // Paginated payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPaymentPage - 1) * paymentsPerPage;
    return getAllPaymentsWithInitial.slice(startIndex, startIndex + paymentsPerPage);
  }, [getAllPaymentsWithInitial, currentPaymentPage]);

  const totalPaymentPages = Math.ceil(getAllPaymentsWithInitial.length / paymentsPerPage);

  const studentsWithBoarding = filteredStudents.filter(s => (s.boardingFee || 0) > 0);
  const studentsWithoutBoarding = filteredStudents.filter(s => (s.boardingFee || 0) === 0);

  const courseEnrollment = filteredCourses.map((c) => ({
    title: c.name,
    value: filteredStudents.filter((s) => s.courseId === c.id).length,
  }));

  // -------------------------------------------------
  // 6. VALIDATIONS - UPDATED
  // -------------------------------------------------
  const validateStudent = () => {
    const e = {};
    if (!studentForm.name) e.name = 'Name required';
    if (!studentForm.courseId) e.courseId = 'Select a course';
    if (!studentForm.cohortId) e.cohortId = 'Select a cohort';
    if (!studentForm.age || studentForm.age <= 0) e.age = 'Valid age required';
    if (!studentForm.gender) e.gender = 'Select gender';
    return e;
  };

  const validateCourse = () => {
    const e = {};
    if (!courseForm.name) e.name = 'Course name required';
    if (!courseForm.fee || courseForm.fee <= 0) e.fee = 'Valid fee required';
    if (!courseForm.weeksOrMonths || courseForm.weeksOrMonths <= 0) e.weeksOrMonths = 'Select duration';
    if (!courseForm.cohortId) e.cohortId = 'Select a cohort';
    return e;
  };

  const validateCohort = () => {
    const e = {};
    if (!cohortForm.name) e.name = 'Cohort name required';
    if (!cohortForm.startDate) e.startDate = 'Start date required';
    if (!cohortForm.endDate) e.endDate = 'End date required';
    
    if (cohortForm.startDate && cohortForm.endDate) {
      const start = parseISO(cohortForm.startDate);
      const end = parseISO(cohortForm.endDate);
      if (isAfter(start, end)) {
        e.endDate = 'End date must be after start date';
      }
    }
    
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

  // -------------------------------------------------
  // 7. ADD HANDLERS - UPDATED
  // -------------------------------------------------
  const openStudentModal = () => {
    setEditingStudentId(null);
    setStudentForm({
      name: '',
      courseId: '',
      cohortId: '',
      age: '',
      gender: '',
      registrationFee: '',
      trainingFee: '',
      boardingFee: '',
      amountPaid: '',
      phoneNumber: '',
      modeOfPayment: '',
      transId: '',
    });
    setFormErrors({});
    setStudentModal(true);
  };

  const openEditStudent = (student) => {
    if (!canEdit) {
      showAlert('You do not have permission to edit students.', 'danger');
      return;
    }
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name || '',
      courseId: student.courseId || '',
      cohortId: student.cohortId || '',
      age: student.age?.toString() || '',
      gender: student.gender || '',
      registrationFee: student.registrationFee?.toString() || '',
      trainingFee: student.trainingFee?.toString() || '',
      boardingFee: student.boardingFee?.toString() || '',
      amountPaid: student.amountPaid?.toString() || '',
      phoneNumber: student.phoneNumber || '',
      modeOfPayment: student.modeOfPayment || '',
      transId: student.transId || '',
    });
    setFormErrors({});
    setStudentModal(true);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    const errors = validateStudent();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: studentForm.name,
      courseId: studentForm.courseId,
      cohortId: studentForm.cohortId,
      age: parseInt(studentForm.age) || 0,
      gender: studentForm.gender,
      registrationFee: parseFloat(studentForm.registrationFee) || 0,
      trainingFee: parseFloat(studentForm.trainingFee) || 0,
      boardingFee: parseFloat(studentForm.boardingFee) || 0,
      amountPaid: parseFloat(studentForm.amountPaid) || 0,
      phoneNumber: studentForm.phoneNumber || '',
      modeOfPayment: studentForm.modeOfPayment || '',
      transId: studentForm.transId || '',
      registrationDate: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    if (editingStudentId) {
      if (!canEdit) {
        showAlert('You do not have permission to edit students.', 'danger');
        return;
      }
      try {
        const { registrationDate, createdAt, ...updatePayload } = payload;
        const studentRef = doc(db, `users/${user.uid}/students`, editingStudentId);
        await updateDoc(studentRef, {
          ...updatePayload,
          updatedAt: serverTimestamp(),
        });
        setStudentModal(false);
        setEditingStudentId(null);
        setFormErrors({});
        showAlert('Student updated successfully!');
        notifyCrud('updated', 'student', studentForm.name);
      } catch (err) {
        console.error(err);
        const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
        showAlert('Failed to update student: ' + msg, 'danger');
      }
      return;
    }

    if (!canCreate) {
      showAlert('You do not have permission to add students.', 'danger');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/students`), payload);
      setStudentModal(false);
      setFormErrors({});
      showAlert('Student added successfully!');
      notifyCrud('created', 'student', studentForm.name);
    } catch (err) {
      console.error(err);
      const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
      showAlert('Failed to add student: ' + msg, 'danger');
    }
  };

  const openCourseModal = () => {
    setEditingCourseId(null);
    setCourseForm({ 
      name: '', 
      fee: '', 
      type: 'weekly', 
      weeksOrMonths: '',
      cohortId: '' 
    });
    setFormErrors({});
    setCourseModal(true);
  };

  const openEditCourse = (course) => {
    if (!canEdit) {
      showAlert('You do not have permission to edit courses.', 'danger');
      return;
    }
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name || '',
      fee: course.fee?.toString() || '',
      type: course.type || 'weekly',
      weeksOrMonths: course.weeksOrMonths?.toString() || '',
      cohortId: course.cohortId || '',
    });
    setFormErrors({});
    setCourseModal(true);
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    const errors = validateCourse();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: courseForm.name,
      fee: parseFloat(courseForm.fee),
      type: courseForm.type,
      weeksOrMonths: parseInt(courseForm.weeksOrMonths),
      cohortId: courseForm.cohortId,
      duration: `${courseForm.weeksOrMonths} ${courseForm.type === 'weekly' ? 'week' : 'month'}${courseForm.weeksOrMonths > 1 ? 's' : ''}`,
      createdAt: serverTimestamp(),
    };

    if (editingCourseId) {
      if (!canEdit) {
        showAlert('You do not have permission to edit courses.', 'danger');
        return;
      }
      try {
        const { createdAt, ...updatePayload } = payload;
        const courseRef = doc(db, `users/${user.uid}/courses`, editingCourseId);
        await updateDoc(courseRef, {
          ...updatePayload,
          updatedAt: serverTimestamp(),
        });
        setCourseModal(false);
        setEditingCourseId(null);
        setFormErrors({});
        showAlert('Course updated successfully!');
        notifyCrud('updated', 'course', courseForm.name);
      } catch (err) {
        console.error(err);
        const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
        showAlert('Failed to update course: ' + msg, 'danger');
      }
      return;
    }

    if (!canCreate) {
      showAlert('You do not have permission to add courses.', 'danger');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/courses`), payload);
      setCourseModal(false);
      setFormErrors({});
      showAlert('Course added successfully!');
      notifyCrud('created', 'course', courseForm.name);
    } catch (err) {
      console.error(err);
      const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
      showAlert('Failed to add course: ' + msg, 'danger');
    }
  };

  const openCohortModal = () => {
    setEditingCohortId(null);
    setCohortForm({ 
      name: '', 
      startDate: '', 
      endDate: '', 
      description: '',
      status: 'active'
    });
    setFormErrors({});
    setCohortModal(true);
  };

  const openEditCohort = (cohort) => {
    if (!canEdit) {
      showAlert('You do not have permission to edit cohorts.', 'danger');
      return;
    }
    setEditingCohortId(cohort.id);
    setCohortForm({
      name: cohort.name || '',
      startDate: cohort.startDate || '',
      endDate: cohort.endDate || '',
      description: cohort.description || '',
      status: cohort.status || 'active',
    });
    setFormErrors({});
    setCohortModal(true);
  };

  const handleCohortSubmit = async (e) => {
    e.preventDefault();
    const errors = validateCohort();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    if (editingCohortId) {
      if (!canEdit) {
        showAlert('You do not have permission to edit cohorts.', 'danger');
        return;
      }
      try {
        const { createdAt, ...updatePayload } = payload;
        const cohortRef = doc(db, `users/${user.uid}/cohorts`, editingCohortId);
        await updateDoc(cohortRef, {
          ...updatePayload,
          updatedAt: serverTimestamp(),
        });
        setCohortModal(false);
        setEditingCohortId(null);
        setFormErrors({});
        showAlert('Cohort updated successfully!');
        notifyCrud('updated', 'cohort', cohortForm.name);
      } catch (err) {
        console.error(err);
        const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
        showAlert('Failed to update cohort: ' + msg, 'danger');
      }
      return;
    }

    if (userProfile && !canCreate) {
      showAlert(
        'You do not have permission to create cohorts. Ask your admin or super-admin to enable "Allow create" in Manage Users.',
        'danger',
      );
      return;
    }

    const payload = {
      name: cohortForm.name,
      startDate: cohortForm.startDate,
      endDate: cohortForm.endDate,
      description: cohortForm.description,
      status: cohortForm.status,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, `users/${user.uid}/cohorts`), payload);
      setCohortModal(false);
      setFormErrors({});
      showAlert('Cohort added successfully!');
      notifyCrud('created', 'cohort', cohortForm.name);
    } catch (err) {
      console.error(err);
      const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
      showAlert('Failed to add cohort: ' + msg, 'danger');
    }
  };

  // -------------------------------------------------
  // 8. PAYMENT HANDLERS - UPDATED
  // -------------------------------------------------
  const openPaymentModal = (student) => {
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

  const openEditPayment = (payment) => {
    if (!canEdit) {
      showAlert('You do not have permission to edit payments.', 'danger');
      return;
    }
    if (payment.isInitialPayment) {
      showAlert('Initial payments cannot be edited here. Use Edit student to update registration payment.', 'warning');
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

  const openPaymentHistory = (student) => {
    setSelectedStudent(student);
    setPaymentHistoryModal(true);
  };

  const openAllPaymentsModal = () => {
    setAllPaymentsModal(true);
    setCurrentPaymentPage(1);
  };

  const openDeleteConfirm = (item, type) => {
    if (!canDelete) {
      showAlert(`You do not have permission to delete ${type}s.`, 'danger');
      return;
    }

    if (type === 'student') {
      setItemToDelete({ ...item, type, name: item.name });
      setDeleteConfirmModal(true);
      return;
    }

    if (type === 'course') {
      const enrolled = students.filter((s) => s.courseId === item.id).length;
      if (enrolled > 0) {
        showAlert(`Cannot delete course — ${enrolled} student(s) are enrolled. Reassign them first.`, 'warning');
        return;
      }
      setItemToDelete({ ...item, type, name: item.name });
      setDeleteConfirmModal(true);
      return;
    }

    if (type === 'cohort') {
      const linkedCourses = courses.filter((c) => c.cohortId === item.id).length;
      const linkedStudents = students.filter((s) => s.cohortId === item.id).length;
      if (linkedCourses > 0 || linkedStudents > 0) {
        showAlert(
          `Cannot delete cohort — ${linkedStudents} student(s) and ${linkedCourses} course(s) still linked.`,
          'warning',
        );
        return;
      }
      setItemToDelete({ ...item, type, name: item.name });
      setDeleteConfirmModal(true);
      return;
    }
    
    if (item.isInitialPayment) {
      showAlert('Initial payments cannot be deleted. Edit the student record instead.', 'warning');
      return;
    }
    
    setItemToDelete({ ...item, type });
    setDeleteConfirmModal(true);
  };

  const handleNewPayment = async () => {
    if (!selectedStudent) return;

    if (!canCreate) {
      showAlert('You do not have permission to record payments.', 'danger');
      return;
    }

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

      await addDoc(collection(db, `users/${user.uid}/payments`), paymentPayload);

      const currentPaid = selectedStudent.amountPaid || 0;
      const newPaid = currentPaid + amount;
      
      const studentRef = doc(db, `users/${user.uid}/students`, selectedStudent.id);
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
      
      showAlert(`Payment of ${formatMK(amount)} recorded successfully for ${selectedStudent.name}!`);
      notifyCrud('created', 'payment', selectedStudent.name, { amount });
    } catch (err) {
      console.error('Error recording payment:', err);
      const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
      showAlert('Error recording payment: ' + msg, 'danger');
    }
  };

  const handleEditPayment = async () => {
    if (!selectedPayment) return;

    if (!canEdit) {
      showAlert('You do not have permission to edit payments.', 'danger');
      return;
    }

    try {
      const paymentRef = doc(db, `users/${user.uid}/payments`, selectedPayment.id);
      await updateDoc(paymentRef, {
        amount: parseFloat(paymentForm.amount) || 0,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes,
        paymentDate: paymentForm.paymentDate ? serverTimestamp() : selectedPayment.paymentDate,
        updatedAt: serverTimestamp(),
      });

      if (selectedPayment.studentId) {
        const studentPayments = payments.filter(p => 
          p.studentId === selectedPayment.studentId
        );
        const totalPaid = studentPayments.reduce((sum, p) => {
          if (p.id === selectedPayment.id) {
            return sum + parseFloat(paymentForm.amount);
          }
          return sum + (p.amount || 0);
        }, 0);
        
        const studentRef = doc(db, `users/${user.uid}/students`, selectedPayment.studentId);
        await updateDoc(studentRef, {
          amountPaid: totalPaid,
          updatedAt: serverTimestamp(),
        });
      }

      setEditPaymentModal(false);
      showAlert('Payment updated successfully!');
      notifyCrud('updated', 'payment', selectedPayment.studentName || 'Payment');
    } catch (err) {
      console.error('Error updating payment:', err);
      showAlert('Error updating payment: ' + err.message, 'danger');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    if (!canDelete) {
      showAlert('You do not have permission to delete this item.', 'danger');
      setDeleteConfirmModal(false);
      return;
    }

    if (itemToDelete.isInitialPayment) {
      showAlert('Initial payments cannot be deleted. Edit the student record instead.', 'warning');
      setDeleteConfirmModal(false);
      return;
    }

    try {
      if (itemToDelete.type === 'student') {
        const studentPayments = payments.filter((p) => p.studentId === itemToDelete.id);
        await Promise.all(
          studentPayments.map((p) =>
            deleteDoc(doc(db, `users/${user.uid}/payments`, p.id)),
          ),
        );
        await deleteDoc(doc(db, `users/${user.uid}/students`, itemToDelete.id));
        showAlert('Student deleted successfully!');
        notifyCrud('deleted', 'student', itemToDelete.name);
      } else if (itemToDelete.type === 'course') {
        await deleteDoc(doc(db, `users/${user.uid}/courses`, itemToDelete.id));
        showAlert('Course deleted successfully!');
        notifyCrud('deleted', 'course', itemToDelete.name);
      } else if (itemToDelete.type === 'cohort') {
        await deleteDoc(doc(db, `users/${user.uid}/cohorts`, itemToDelete.id));
        showAlert('Cohort deleted successfully!');
        notifyCrud('deleted', 'cohort', itemToDelete.name);
      } else if (itemToDelete.type === 'payment') {
        const paymentRef = doc(db, `users/${user.uid}/payments`, itemToDelete.id);
        await deleteDoc(paymentRef);

        if (itemToDelete.studentId) {
          const studentPayments = payments.filter(p => 
            p.studentId === itemToDelete.studentId &&
            p.id !== itemToDelete.id
          );
          const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const studentRef = doc(db, `users/${user.uid}/students`, itemToDelete.studentId);
          await updateDoc(studentRef, {
            amountPaid: totalPaid,
            updatedAt: serverTimestamp(),
          });
        }
        showAlert('Payment deleted successfully!');
        notifyCrud('deleted', 'payment', itemToDelete.studentName || 'Payment');
      }

      setDeleteConfirmModal(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      const msg = err.code === 'permission-denied' ? permissionDeniedMsg : err.message;
      showAlert('Error deleting item: ' + msg, 'danger');
    }
  };

  // -------------------------------------------------
  // 9. PDF EXPORTS - UPDATED
  // -------------------------------------------------
  const exportMyStatementPDF = () => {
    try {
      downloadFeeStatement({
        students,
        courses,
        cohorts,
        calcTotalDue,
        calcBalance,
        ownerName: userProfile?.fullName || userProfile?.email,
      });
      showAlert(`Exported all ${students.length} students to PDF`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to export statement PDF', 'danger');
    }
  };

  const exportAllPaymentsPDF = () => {
    try {
      downloadPaymentsAudit({
        payments: getAllPaymentsWithInitial,
        includeOwner: false,
        title: 'Complete Payments Audit',
      });
      showAlert(`Exported ${getAllPaymentsWithInitial.length} payment records to PDF`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to export payments PDF', 'danger');
    }
  };

  const generateDetailedReceipt = (student) => {
    try {
      const course = courses.find((c) => c.id === student.courseId);
      const cohort = cohorts.find((coh) => coh.id === student.cohortId);

      const studentPayments = getAllPaymentsWithInitial
        .filter((p) => p.studentId === student.id)
        .sort((a, b) => {
          const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
          const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
          return dateB - dateA;
        });

      downloadStudentReceipt({
        student,
        course,
        cohort,
        payments: studentPayments,
        calcTotalDue,
        extraFields: [['Duration', course?.duration || 'N/A']],
      });
      showAlert(`Receipt saved for ${student.name}`);
    } catch (error) {
      console.error('PDF Error:', error);
      showAlert('Failed to generate receipt', 'danger');
    }
  };

  // -------------------------------------------------
  // 10. HELPERS - UPDATED
  // -------------------------------------------------
  const calcTotalDue = (student) => {
    if (!student) return 0;
    const course = courses.find((c) => c.id === student.courseId);
    return (course?.fee || 0) +
           (student.registrationFee || 0) +
           (student.trainingFee || 0) +
           (student.boardingFee || 0);
  };

  const calcBalance = (student) => {
    if (!student) return 0;
    const totalDue = calcTotalDue(student);
    return totalDue - (student.amountPaid || 0);
  };

  const getCohortStatus = (cohort) => {
    if (!cohort?.startDate || !cohort?.endDate) return { text: 'Unknown', color: 'secondary' };
    
    try {
      const now = new Date();
      const start = parseISO(cohort.startDate);
      const end = parseISO(cohort.endDate);
      
      if (isBefore(now, start)) return { text: 'Upcoming', color: 'warning' };
      if (isAfter(now, end)) return { text: 'Completed', color: 'secondary' };
      return { text: 'Active', color: 'success' };
    } catch (error) {
      return { text: 'Unknown', color: 'secondary' };
    }
  };

  const getCohortDuration = (cohort) => {
    if (!cohort?.startDate || !cohort?.endDate) return 'Unknown';
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
    if (!cohort?.startDate || !cohort?.endDate) return 0;
    const now = new Date();
    const start = parseISO(cohort.startDate);
    const end = parseISO(cohort.endDate);
    const totalDuration = end - start;
    const elapsed = now - start;
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const getCoursesByCohort = (cohortId) => {
    return courses.filter(c => c.cohortId === cohortId);
  };

  const getStudentsByCohort = (cohortId) => {
    return students.filter(s => s.cohortId === cohortId);
  };

  const getPaymentMethodColor = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash': return 'success';
      case 'bank': return 'primary';
      case 'mobile': return 'info';
      default: return 'secondary';
    }
  };

  const getPaymentTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'initial': return 'warning';
      case 'additional': return 'success';
      default: return 'info';
    }
  };

  const progressStats = [
    { 
      title: 'Total Students', 
      value: `${filteredStudents.length}`, 
      percent: 100, 
      color: 'success' 
    },
    { 
      title: 'Active Cohorts', 
      value: `${cohorts.filter(c => getCohortStatus(c).text === 'Active').length}`, 
      percent: 100, 
      color: 'info' 
    },
    { 
      title: 'With Boarding', 
      value: `${studentsWithBoarding.length}`, 
      percent: filteredStudents.length > 0 ? (studentsWithBoarding.length / filteredStudents.length) * 100 : 0, 
      color: 'primary' 
    },
    { 
      title: 'Collected', 
      value: formatMK(totalCollected), 
      percent: 100, 
      color: 'success' 
    },
    { 
      title: 'Pending Balance', 
      value: formatMK(totalBalance), 
      percent: 100, 
      color: 'danger' 
    },
  ];

  // -------------------------------------------------
  // 11. LOADING STATE - UPDATED
  // -------------------------------------------------
  if (authLoading || dataLoading) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CSpinner color="primary" />
          <div className="mt-2">
            {authLoading ? 'Verifying user...' : 'Loading your data...'}
          </div>
        </CCol>
      </CRow>
    );
  }

  if (!subscriptionOk) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CAlert color="danger">
            No active subscription. Please subscribe to access the dashboard.
          </CAlert>
          <CButton color="primary" onClick={() => navigate('/subscription')}>
            Go to Subscription
          </CButton>
        </CCol>
      </CRow>
    );
  }

  if (!['student', 'admin', 'super-admin'].includes(userRole)) {
    return (
      <CRow className="justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <CCol xs="auto" className="text-center">
          <CAlert color="danger">
            Access denied. This dashboard is for Coordinators only.
          </CAlert>
        </CCol>
      </CRow>
    );
  }

  // -------------------------------------------------
  // 13. RENDER
  // -------------------------------------------------
  return (
    <>
      {/* All Payments Modal */}
      <CModal size="xl" visible={allPaymentsModal} onClose={() => setAllPaymentsModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilList} className="me-2" />
            Complete Payment Audit ({getAllPaymentsWithInitial.length})
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="mb-3">
            <CCol md={6}>
              <CInputGroup>
                <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                <CFormInput 
                  placeholder="Search payments by student, reference..." 
                  value={paymentSearchQuery} 
                  onChange={(e) => setPaymentSearchQuery(e.target.value)} 
                />
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CFormSelect value={paymentDateFilter} onChange={(e) => setPaymentDateFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol>
              <CCard className="bg-light">
                <CCardBody className="py-2">
                  <CRow className="text-center">
                    <CCol>
                      <strong>Total Records:</strong> {getAllPaymentsWithInitial.length}
                    </CCol>
                    <CCol>
                      <strong>Total Amount:</strong> {formatMK(getAllPaymentsWithInitial.reduce((sum, p) => sum + (p.amount || 0), 0))}
                    </CCol>
                    <CCol>
                      <strong>Initial Payments:</strong> {getAllPaymentsWithInitial.filter(p => p.isInitialPayment).length}
                    </CCol>
                    <CCol>
                      <strong>Additional Payments:</strong> {getAllPaymentsWithInitial.filter(p => !p.isInitialPayment).length}
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Date & Time</CTableHeaderCell>
                <CTableHeaderCell>Student</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Amount</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Method</CTableHeaderCell>
                <CTableHeaderCell>Reference</CTableHeaderCell>
                <CTableHeaderCell>Notes</CTableHeaderCell>
                <CTableHeaderCell className="text-center">Type</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {paginatedPayments.map((payment) => {
                const paymentDate = payment.paymentDate?.toDate ? format(payment.paymentDate.toDate(), 'dd/MM/yyyy HH:mm') : '—';
                const paymentType = payment.isInitialPayment ? 'Initial' : (payment.transactionType || 'Additional');
                return (
                  <CTableRow key={payment.id || payment.studentId}>
                    <CTableDataCell>{paymentDate}</CTableDataCell>
                    <CTableDataCell>
                      <strong>{payment.studentName || '—'}</strong>
                      {payment.isInitialPayment && (
                        <div className="small text-muted">Initial Registration</div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-center fw-bold text-success">
                      {formatMK(payment.amount || 0)}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color={getPaymentMethodColor(payment.paymentMethod)}>
                        {payment.paymentMethod}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{payment.referenceNumber || '—'}</CTableDataCell>
                    <CTableDataCell>{payment.notes || '—'}</CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                        {paymentType}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                );
              })}
            </CTableBody>
          </CTable>

          {totalPaymentPages > 1 && (
            <CRow className="mt-3">
              <CCol className="d-flex justify-content-center">
                <CPagination>
                  <CPaginationItem 
                    disabled={currentPaymentPage === 1}
                    onClick={() => setCurrentPaymentPage(currentPaymentPage - 1)}
                  >
                    <CIcon icon={cilArrowLeft} />
                  </CPaginationItem>
                  {Array.from({ length: totalPaymentPages }, (_, i) => i + 1).map(page => (
                    <CPaginationItem
                      key={page}
                      active={page === currentPaymentPage}
                      onClick={() => setCurrentPaymentPage(page)}
                    >
                      {page}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem 
                    disabled={currentPaymentPage === totalPaymentPages}
                    onClick={() => setCurrentPaymentPage(currentPaymentPage + 1)}
                  >
                    <CIcon icon={cilArrowRight} />
                  </CPaginationItem>
                </CPagination>
              </CCol>
            </CRow>
          )}

          {getAllPaymentsWithInitial.length === 0 && (
            <CAlert color="info" className="text-center">
              No payment records found.
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={exportAllPaymentsPDF}>
            <CIcon icon={cilCloudDownload} /> Export Audit PDF
          </CButton>
          <CButton color="secondary" onClick={() => setAllPaymentsModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Payment Modal */}
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
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Payment Date</CFormLabel>
              <CFormInput
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Payment Method *</CFormLabel>
              <CFormSelect
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
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
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Enter payment notes"
                rows={3}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditPaymentModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleEditPayment}>Save Changes</CButton>
        </CModalFooter>
      </CModal>

      {/* New Payment Modal */}
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
                    Course: {formatMK(courses.find(c => c.id === selectedStudent.courseId)?.fee || 0)} | 
                    Reg: {formatMK(selectedStudent.registrationFee || 0)} | 
                    Training: {formatMK(selectedStudent.trainingFee || 0)} | 
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
                  />
                  {formErrors.amount && <div className="invalid-feedback">{formErrors.amount}</div>}
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Payment Method *</CFormLabel>
                  <CFormSelect
                    value={newPaymentForm.paymentMethod}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, paymentMethod: e.target.value })}
                    invalid={!!formErrors.paymentMethod}
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
                  />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Notes</CFormLabel>
                  <CFormTextarea
                    value={newPaymentForm.notes}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, notes: e.target.value })}
                    placeholder="Enter payment notes (optional)"
                    rows={3}
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
          <CButton color="success" onClick={handleNewPayment}>Record Payment</CButton>
        </CModalFooter>
      </CModal>

      {/* Payment History Modal */}
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
                    Course: {formatMK(courses.find(c => c.id === selectedStudent.courseId)?.fee || 0)} | 
                    Reg: {formatMK(selectedStudent.registrationFee || 0)} | 
                    Training: {formatMK(selectedStudent.trainingFee || 0)} | 
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
                    {(canEdit || canDelete) && (
                      <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
                    )}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {getAllPaymentsWithInitial
                    .filter(p => p.studentId === selectedStudent.id)
                    .sort((a, b) => {
                      const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
                      const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
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
                          <CTableDataCell>{payment.referenceNumber || '—'}</CTableDataCell>
                          <CTableDataCell>{payment.notes || '—'}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getPaymentTypeColor(paymentType.toLowerCase())}>
                              {paymentType}
                            </CBadge>
                          </CTableDataCell>
                          {(canEdit || canDelete) && (
                            <CTableDataCell className="text-center">
                              {!payment.isInitialPayment && canEdit && (
                                <CButton
                                  size="sm"
                                  color="primary"
                                  variant="ghost"
                                  className="me-1"
                                  onClick={() => openEditPayment(payment)}
                                >
                                  Edit
                                </CButton>
                              )}
                              {!payment.isInitialPayment && canDelete && (
                                <CButton
                                  size="sm"
                                  color="danger"
                                  variant="ghost"
                                  onClick={() => openDeleteConfirm(payment, 'payment')}
                                >
                                  Delete
                                </CButton>
                              )}
                              {payment.isInitialPayment && (
                                <span className="small text-muted">Edit student</span>
                              )}
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      );
                    })}
                </CTableBody>
              </CTable>
              {getAllPaymentsWithInitial.filter(p => p.studentId === selectedStudent.id).length === 0 && (
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
          <br /><br />
          <strong>
            {itemToDelete?.name || itemToDelete?.referenceNumber || `ID: ${itemToDelete?.id?.substring(0, 8)}`}
          </strong>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteConfirmModal(false)}>Cancel</CButton>
          <CButton color="danger" onClick={handleDelete}>Delete</CButton>
        </CModalFooter>
      </CModal>

      {/* Student Modal */}
      <CModal size="lg" visible={studentModal} onClose={() => { setStudentModal(false); setEditingStudentId(null); }}>
        <CModalHeader><CModalTitle>{editingStudentId ? 'Edit Student' : 'Add New Student'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleStudentSubmit}>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Full Name *</CFormLabel>
                <CFormInput 
                  value={studentForm.name} 
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} 
                  invalid={!!formErrors.name} 
                  placeholder="Enter full name"
                />
                {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Cohort *</CFormLabel>
                <CFormSelect 
                  value={studentForm.cohortId} 
                  onChange={(e) => setStudentForm({ ...studentForm, cohortId: e.target.value })} 
                  invalid={!!formErrors.cohortId}
                >
                  <option value="">Select Cohort…</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </CFormSelect>
                {formErrors.cohortId && <div className="invalid-feedback">{formErrors.cohortId}</div>}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Course *</CFormLabel>
                <CFormSelect 
                  value={studentForm.courseId} 
                  onChange={(e) => setStudentForm({ ...studentForm, courseId: e.target.value })} 
                  invalid={!!formErrors.courseId}
                >
                  <option value="">Select Course…</option>
                  {courses.filter(c => c.cohortId === studentForm.cohortId).map(c => 
                    <option key={c.id} value={c.id}>{c.name} ({formatMK(c.fee)})</option>
                  )}
                </CFormSelect>
                {formErrors.courseId && <div className="invalid-feedback">{formErrors.courseId}</div>}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Age *</CFormLabel>
                <CFormInput 
                  type="number" 
                  value={studentForm.age} 
                  onChange={(e) => setStudentForm({ ...studentForm, age: e.target.value })} 
                  invalid={!!formErrors.age} 
                  placeholder="Enter age"
                />
                {formErrors.age && <div className="invalid-feedback">{formErrors.age}</div>}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Gender *</CFormLabel>
                <CFormSelect 
                  value={studentForm.gender} 
                  onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })} 
                  invalid={!!formErrors.gender}
                >
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                </CFormSelect>
                {formErrors.gender && <div className="invalid-feedback">{formErrors.gender}</div>}
              </CCol>
              <CCol md={6}>
                <CFormLabel>Phone Number</CFormLabel>
                <CFormInput 
                  type="tel" 
                  value={studentForm.phoneNumber} 
                  onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })} 
                  placeholder="0991234567"
                />
              </CCol>
              
              <CCol md={12}>
                <hr />
                <h6>Fee Structure</h6>
              </CCol>
              
              <CCol md={4}>
                <CFormLabel>Registration Fee</CFormLabel>
                <CFormInput 
                  type="number" 
                  step="0.01" 
                  value={studentForm.registrationFee} 
                  onChange={(e) => setStudentForm({ ...studentForm, registrationFee: e.target.value })} 
                  placeholder="0.00"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Training Fee</CFormLabel>
                <CFormInput 
                  type="number" 
                  step="0.01" 
                  value={studentForm.trainingFee} 
                  onChange={(e) => setStudentForm({ ...studentForm, trainingFee: e.target.value })} 
                  placeholder="0.00"
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Boarding Fee</CFormLabel>
                <CFormInput 
                  type="number" 
                  step="0.01" 
                  placeholder="0 if none" 
                  value={studentForm.boardingFee} 
                  onChange={(e) => setStudentForm({ ...studentForm, boardingFee: e.target.value })} 
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Amount Already Paid</CFormLabel>
                <CFormInput 
                  type="number" 
                  step="0.01" 
                  value={studentForm.amountPaid} 
                  onChange={(e) => setStudentForm({ ...studentForm, amountPaid: e.target.value })} 
                  placeholder="0.00"
                />
              </CCol>
              
              <CCol md={12}>
                <hr />
                <h6>Payment Details</h6>
              </CCol>
              
              <CCol md={6}>
                <CFormLabel>Payment Mode</CFormLabel>
                <CFormSelect 
                  value={studentForm.modeOfPayment} 
                  onChange={(e) => setStudentForm({ ...studentForm, modeOfPayment: e.target.value })}
                >
                  <option value="">Select Payment Mode</option>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Mobile Money</option>
                  <option>Cheque</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Transaction ID</CFormLabel>
                <CFormInput 
                  type="text" 
                  value={studentForm.transId} 
                  onChange={(e) => setStudentForm({ ...studentForm, transId: e.target.value })} 
                  placeholder="Enter transaction ID"
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setStudentModal(false); setEditingStudentId(null); }}>Cancel</CButton>
          <CButton color="primary" onClick={handleStudentSubmit}>
            {editingStudentId ? 'Save Changes' : 'Add Student'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Course Modal */}
      <CModal visible={courseModal} onClose={() => { setCourseModal(false); setEditingCourseId(null); }}>
        <CModalHeader><CModalTitle>{editingCourseId ? 'Edit Course' : 'Add Course'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCourseSubmit}>
            <CRow className="g-3">
              <CCol md={6}><CFormLabel>Name</CFormLabel><CFormInput value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} invalid={!!formErrors.name} />{formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}</CCol>
              <CCol md={6}><CFormLabel>Cohort</CFormLabel><CFormSelect value={courseForm.cohortId} onChange={(e) => setCourseForm({ ...courseForm, cohortId: e.target.value })} invalid={!!formErrors.cohortId}><option value="">Select Cohort…</option>{cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</CFormSelect>{formErrors.cohortId && <div className="invalid-feedback">{formErrors.cohortId}</div>}</CCol>
              <CCol md={6}><CFormLabel>Fee (MK)</CFormLabel><CFormInput type="number" step="0.01" value={courseForm.fee} onChange={(e) => setCourseForm({ ...courseForm, fee: e.target.value })} invalid={!!formErrors.fee} />{formErrors.fee && <div className="invalid-feedback">{formErrors.fee}</div>}</CCol>
              <CCol md={6}><CFormLabel>Type</CFormLabel><CFormSelect value={courseForm.type} onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></CFormSelect></CCol>
              <CCol md={6}><CFormLabel>Duration</CFormLabel><CFormSelect value={courseForm.weeksOrMonths} onChange={(e) => setCourseForm({ ...courseForm, weeksOrMonths: e.target.value })} invalid={!!formErrors.weeksOrMonths}><option value="">Select…</option>{Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</CFormSelect>{formErrors.weeksOrMonths && <div className="invalid-feedback">{formErrors.weeksOrMonths}</div>}</CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setCourseModal(false); setEditingCourseId(null); }}>Cancel</CButton>
          <CButton color="primary" onClick={handleCourseSubmit}>
            {editingCourseId ? 'Save Changes' : 'Add Course'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Cohort Modal */}
      <CModal visible={cohortModal} onClose={() => { setCohortModal(false); setEditingCohortId(null); }}>
        <CModalHeader><CModalTitle>{editingCohortId ? 'Edit Cohort' : 'Add Academic Cohort'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCohortSubmit}>
            <CRow className="g-3">
              <CCol md={12}><CFormLabel>Cohort Name</CFormLabel><CFormInput value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} invalid={!!formErrors.name} placeholder="e.g., 2024 Q1 Intake, Summer 2024, etc." />{formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}</CCol>
              <CCol md={6}><CFormLabel>Start Date</CFormLabel><CFormInput type="date" value={cohortForm.startDate} onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })} invalid={!!formErrors.startDate} />{formErrors.startDate && <div className="invalid-feedback">{formErrors.startDate}</div>}</CCol>
              <CCol md={6}><CFormLabel>End Date</CFormLabel><CFormInput type="date" value={cohortForm.endDate} onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })} invalid={!!formErrors.endDate} />{formErrors.endDate && <div className="invalid-feedback">{formErrors.endDate}</div>}</CCol>
              <CCol md={12}><CFormLabel>Description</CFormLabel><CFormInput type="text" value={cohortForm.description} onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })} placeholder="Optional description" /></CCol>
              <CCol md={12}><CFormLabel>Status</CFormLabel><CFormSelect value={cohortForm.status} onChange={(e) => setCohortForm({ ...cohortForm, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></CFormSelect></CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setCohortModal(false); setEditingCohortId(null); }}>Cancel</CButton>
          <CButton color="primary" onClick={handleCohortSubmit}>
            {editingCohortId ? 'Save Changes' : 'Add Cohort'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CoordinatorDashboardView
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterCourse={filterCourse}
        setFilterCourse={setFilterCourse}
        filterCohort={filterCohort}
        setFilterCohort={setFilterCohort}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        filteredCohorts={filteredCohorts}
        filteredCourses={filteredCourses}
        filteredStudents={filteredStudents}
        courses={courses}
        cohorts={cohorts}
        totalCollected={totalCollected}
        totalBalance={totalBalance}
        courseEnrollment={courseEnrollment}
        getAllPaymentsWithInitial={getAllPaymentsWithInitial}
        getCohortStatus={getCohortStatus}
        getCohortProgress={getCohortProgress}
        getCohortDuration={getCohortDuration}
        calcBalance={calcBalance}
        calcTotalDue={calcTotalDue}
        formatMK={formatMK}
        getPaymentMethodColor={getPaymentMethodColor}
        getPaymentTypeColor={getPaymentTypeColor}
        openStudentModal={openStudentModal}
        openEditStudent={openEditStudent}
        openCourseModal={openCourseModal}
        openEditCourse={openEditCourse}
        openCohortModal={openCohortModal}
        openEditCohort={openEditCohort}
        openDeleteConfirm={openDeleteConfirm}
        openAllPaymentsModal={openAllPaymentsModal}
        exportMyStatementPDF={exportMyStatementPDF}
        openPaymentModal={openPaymentModal}
        openPaymentHistory={openPaymentHistory}
        generateDetailedReceipt={generateDetailedReceipt}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        accessSummary={userProfile ? permissionsSummary(userProfile) : ''}
        permissionBlock={permissionBlock}
      />
    </>
  );
};

export default Dashboard;