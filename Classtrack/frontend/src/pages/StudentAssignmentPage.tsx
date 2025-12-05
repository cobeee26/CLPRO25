import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with interceptor
const createApiClient = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      
      if (error.response?.status === 401) {
        console.error('Authentication failed, redirecting to login...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

const apiClient = createApiClient();

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  class_id: number;
  creator_id: number;
  created_at: string;
  class_name?: string;
  class_code?: string;
  due_date?: string;
  teacher_name?: string;
}

interface Submission {
  id?: number;
  assignment_id: number;
  student_id: number;
  content: string;
  file_path?: string;
  submitted_at?: string;
  grade?: number | null;
  feedback?: string | null;
  is_graded?: boolean;
  file_name?: string;
  time_spent_minutes?: number;
  link_url?: string;
}

interface Schedule {
  id: number;
  class_id: number;
  class_name: string;
  class_code: string;
  teacher_name: string;
  teacher_full_name: string;
  room_number: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface Violation {
  id?: number;
  student_id: number;
  assignment_id: number;
  violation_type: 'tab_switch' | 'app_switch' | 'rapid_completion' | 'paste_detected' | 'suspicious_activity' | 'excessive_inactivity' | 'ai_content_detected';
  description: string;
  detected_at: string;
  time_away_seconds: number;
  severity: 'low' | 'medium' | 'high';
  content_added_during_absence?: number;
  ai_similarity_score?: number;
  paste_content_length?: number;
}

const StudentAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useUser();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timeSpentRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  
  // Refs for time tracking and monitoring
  const startTimeRef = useRef<number>(Date.now());
  const activeTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const pageUnloadRef = useRef<boolean>(false);
  const lastPagePathRef = useRef<string>(window.location.pathname);
  
  // Refs for strict monitoring (text typing mode)
  const strictModeRef = useRef<boolean>(false);
  const tabSwitchCountRef = useRef<number>(0);
  const lastTabSwitchTimeRef = useRef<number>(Date.now());
  const typingStartTimeRef = useRef<number | null>(null);
  const lastTypingTimeRef = useRef<number>(Date.now());
  const initialContentLengthRef = useRef<number>(0);
  const contentAddedWhileAwayRef = useRef<number>(0);
  const violationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const keystrokesCountRef = useRef<number>(0);
  const pasteDetectionRef = useRef<boolean>(false);
  const hasTypedRef = useRef<boolean>(false);
  const wasAwayDuringTypingRef = useRef<boolean>(false);
  const lastFocusTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentSnapshotRef = useRef<string>('');
  const timeWhenLeftRef = useRef<number>(0);
  const contentBeforeLeavingRef = useRef<number>(0);
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const consecutiveTabSwitchRef = useRef<number>(0);
  const lastTabSwitchTimestampRef = useRef<number>(Date.now());
  const tabSwitchHistoryRef = useRef<number[]>([]);
  const largePasteCountRef = useRef<number>(0);
  const lastLargePasteTimeRef = useRef<number>(Date.now());
  const aiContentDetectionRef = useRef<boolean>(false);
  const excessiveInactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tabSwitchWindowRef = useRef<number>(15000);

  const handleLogout = () => {
    try {
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  // Validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Detect AI-generated content patterns
  const detectAIContent = (content: string): { isSuspicious: boolean; score: number } => {
    const text = content.toLowerCase();
    let score = 0;
    
    const aiPatterns = [
      /\bhowever\b.*\bfurthermore\b/i,
      /\bin conclusion\b.*\bit is clear that\b/i,
      /\bon the other hand\b.*\bon the one hand\b/i,
      /\bas a result\b.*\bconsequently\b/i,
      /\bmoreover\b.*\badditionally\b/i,
      /\bnevertheless\b.*\bnone the less\b/i,
      /\bin summary\b.*\bto summarize\b/i,
      /\bit should be noted that\b.*\bit is important to\b/i,
      /\bfrom this perspective\b.*\bin this context\b/i,
    ];
    
    if (text.length > 500) {
      const sentences = text.split(/[.!?]+/);
      const avgSentenceLength = sentences.reduce((acc, sentence) => acc + sentence.split(' ').length, 0) / sentences.length;
      
      if (avgSentenceLength > 25) score += 0.3;
      if (sentences.length > 20 && text.length / sentences.length > 100) score += 0.2;
    }
    
    aiPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        score += 0.15;
      }
    });
    
    const personalPronouns = ['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'];
    const pronounCount = personalPronouns.reduce((count, pronoun) => {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
      return count + (text.match(regex)?.length || 0);
    }, 0);
    
    if (text.length > 200 && pronounCount < 3) {
      score += 0.2;
    }
    
    return {
      isSuspicious: score > 0.5,
      score: Math.min(score, 1.0)
    };
  };

  // Detect large copy-paste operations
  const detectLargePaste = (oldContent: string, newContent: string): { isLargePaste: boolean; addedLength: number } => {
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const addedLength = newLength - oldLength;
    
    const isLargePaste = addedLength > 100;
    
    return {
      isLargePaste,
      addedLength
    };
  };

  // Check for excessive tab switching - UPDATED TO 15 SECONDS
  const checkExcessiveTabSwitching = (currentTime: number): boolean => {
    tabSwitchHistoryRef.current.push(currentTime);
    
    const fifteenSecondsAgo = currentTime - tabSwitchWindowRef.current;
    tabSwitchHistoryRef.current = tabSwitchHistoryRef.current.filter(time => time > fifteenSecondsAgo);
    
    if (tabSwitchHistoryRef.current.length >= 3) {
      return true;
    }
    
    return false;
  };

  // Check for excessive inactivity
  const checkExcessiveInactivity = (): boolean => {
    const now = Date.now();
    const timeSinceLastAction = now - Math.max(lastTypingTimeRef.current, lastFocusTimeRef.current);
    
    if (strictModeRef.current && hasTypedRef.current && timeSinceLastAction > 300000) {
      return true;
    }
    
    return false;
  };

  // Report violation to server and localStorage
  const reportViolation = async (violationData: Omit<Violation, 'id' | 'detected_at'>) => {
    if (!user || !assignmentId) return;
    
    try {
      const violation: Violation = {
        ...violationData,
        detected_at: new Date().toISOString()
      };
      
      console.log('🚨 VIOLATION DETECTED:', violation);
      
      const savedViolations = JSON.parse(localStorage.getItem(`assignment_${assignmentId}_violations`) || '[]');
      savedViolations.push(violation);
      localStorage.setItem(`assignment_${assignmentId}_violations`, JSON.stringify(savedViolations));
      
      setViolations(prev => [...prev, violation]);
      
      if (violation.severity === 'high' || violation.severity === 'medium') {
        setShowViolationWarning(true);
        setViolationMessage(`⚠️ ${violation.description}`);
        
        setTimeout(() => {
          setShowViolationWarning(false);
        }, 5000);
      }
      
      try {
        await apiClient.post('/violations/', violation);
        console.log('✅ Violation reported to server');
      } catch (apiError) {
        console.warn('⚠️ Could not send violation to server, stored locally');
      }
      
    } catch (error) {
      console.error('Error reporting violation:', error);
    }
  };

  // Check for text mode violations
  const checkTextModeViolations = () => {
    if (!strictModeRef.current || !assignmentId || !user) return;
    
    const now = Date.now();
    const content = contentRef.current?.value || '';
    const currentLength = content.length;
    
    // Fix: Add optional chaining to avoid 'undefined' error
    if (typingStartTimeRef.current && hasTypedRef.current) {
      const typingDuration = (now - typingStartTimeRef.current) / 1000;
      const charsPerMinute = (currentLength / typingDuration) * 60;
      
      if (charsPerMinute > 250 && currentLength > 100) {
        reportViolation({
          student_id: user.id,
          assignment_id: parseInt(assignmentId),
          violation_type: 'rapid_completion',
          description: `Unusually high typing speed detected: ${Math.round(charsPerMinute)} characters per minute. Possible copy-paste or AI assistance.`,
          time_away_seconds: 0,
          severity: 'medium'
        });
      }
    }
    
    if (pasteDetectionRef.current && hasTypedRef.current) {
      const currentTime = Date.now();
      const timeSinceLastPaste = currentTime - lastLargePasteTimeRef.current;
      
      if (timeSinceLastPaste < 30000) {
        largePasteCountRef.current += 1;
        
        if (largePasteCountRef.current >= 2) {
          reportViolation({
            student_id: user.id,
            assignment_id: parseInt(assignmentId),
            violation_type: 'paste_detected',
            description: 'Multiple large copy-paste operations detected within short timeframe. High likelihood of cheating.',
            time_away_seconds: 0,
            severity: 'high',
            paste_content_length: content.length
          });
          largePasteCountRef.current = 0;
        } else {
          reportViolation({
            student_id: user.id,
            assignment_id: parseInt(assignmentId),
            violation_type: 'paste_detected',
            description: 'Large amount of text added at once detected. Possible copy-paste operation.',
            time_away_seconds: 0,
            severity: 'medium',
            paste_content_length: content.length
          });
        }
      } else {
        largePasteCountRef.current = 1;
        reportViolation({
          student_id: user.id,
          assignment_id: parseInt(assignmentId),
          violation_type: 'paste_detected',
          description: 'Large amount of text added at once detected. Possible copy-paste operation.',
          time_away_seconds: 0,
          severity: 'medium',
          paste_content_length: content.length
        });
      }
      
      lastLargePasteTimeRef.current = currentTime;
      pasteDetectionRef.current = false;
    }
    
    // Check for AI-generated content
    if (currentLength > 200 && !aiContentDetectionRef.current) {
      const aiDetection = detectAIContent(content);
      if (aiDetection.isSuspicious) {
        reportViolation({
          student_id: user.id,
          assignment_id: parseInt(assignmentId),
          violation_type: 'ai_content_detected',
          description: `AI-generated content pattern detected. Similarity score: ${(aiDetection.score * 100).toFixed(1)}%. Content appears to be AI-assisted.`,
          time_away_seconds: 0,
          severity: 'high',
          ai_similarity_score: aiDetection.score
        });
        aiContentDetectionRef.current = true;
      }
    }
    
    // Check for excessive inactivity
    if (checkExcessiveInactivity()) {
      reportViolation({
        student_id: user.id,
        assignment_id: parseInt(assignmentId),
        violation_type: 'excessive_inactivity',
        description: 'Excessive inactivity detected while working on text assignment. Possible cheating or unauthorized assistance.',
        time_away_seconds: 300,
        severity: 'high'
      });
      
      if (excessiveInactivityTimerRef.current) {
        clearTimeout(excessiveInactivityTimerRef.current);
      }
      excessiveInactivityTimerRef.current = setTimeout(() => {
        if (strictModeRef.current && hasTypedRef.current) {
          reportViolation({
            student_id: user.id,
            assignment_id: parseInt(assignmentId),
            violation_type: 'excessive_inactivity',
            description: 'Extended inactivity detected. System may reset time tracking.',
            time_away_seconds: 600,
            severity: 'high'
          });
        }
      }, 600000);
    }
    
    // Update last typing time
    if (content.length > 0 && hasTypedRef.current) {
      lastTypingTimeRef.current = now;
    }
  };

  // Handle tab/app switching in TEXT MODE
  const handleTabSwitchDetection = () => {
    if (!strictModeRef.current || !hasTypedRef.current) return;
    
    const now = Date.now();
    const timeSinceLastSwitch = now - lastTabSwitchTimeRef.current;
    
    // Fix: Use optional chaining to safely access value length
    const contentBefore = contentBeforeLeavingRef.current;
    const contentAfter = contentRef.current?.value?.length || 0;
    const contentAdded = contentAfter - contentBefore;
    
    console.log(`📊 Tab switch detection:`, {
      awayTime: Math.round(timeSinceLastSwitch/1000) + 's',
      contentBefore,
      contentAfter,
      contentAdded,
      wasTypingBeforeLeaving: isCurrentlyTypingRef.current,
      switchHistory: tabSwitchHistoryRef.current.length
    });
    
    // Check for excessive tab switching
    const isExcessiveTabSwitching = checkExcessiveTabSwitching(now);
    
    if (isExcessiveTabSwitching) {
      reportViolation({
        student_id: user?.id || 0,
        assignment_id: parseInt(assignmentId || '0'),
        violation_type: 'tab_switch',
        description: `Excessive tab switching detected: ${tabSwitchHistoryRef.current.length} switches within 15 seconds. Highly suspicious behavior.`,
        time_away_seconds: Math.round(timeSinceLastSwitch / 1000),
        severity: 'high'
      });
      
      tabSwitchHistoryRef.current = [];
    }
    
    // HIGH SEVERITY: Text added while away
    if (contentAdded > 0 && timeSinceLastSwitch > 1000) {
      contentAddedWhileAwayRef.current += contentAdded;
      wasAwayDuringTypingRef.current = true;
      
      const isLargePaste = contentAdded > 100;
      
      reportViolation({
        student_id: user?.id || 0,
        assignment_id: parseInt(assignmentId || '0'),
        violation_type: 'app_switch',
        description: `Text added while away from page: ${contentAdded} characters added during ${Math.round(timeSinceLastSwitch/1000)}s absence. ${isLargePaste ? 'Large copy-paste detected.' : ''} Possible cheating detected.`,
        time_away_seconds: Math.round(timeSinceLastSwitch / 1000),
        severity: 'high',
        content_added_during_absence: contentAdded
      });
      
      // RESET TIME TRACKING IMMEDIATELY
      resetTimeTrackingForTextMode();
      return;
    }
    // HIGH SEVERITY: Away for too long even without adding content
    else if (timeSinceLastSwitch > 30000 && isCurrentlyTypingRef.current) {
      reportViolation({
        student_id: user?.id || 0,
        assignment_id: parseInt(assignmentId || '0'),
        violation_type: 'suspicious_activity',
        description: `Left page while typing for ${Math.round(timeSinceLastSwitch/1000)}s. Extended absence suggests possible cheating.`,
        time_away_seconds: Math.round(timeSinceLastSwitch / 1000),
        severity: 'high'
      });
      
      // Medium severity for shorter absences
    } else if (timeSinceLastSwitch > 10000 && isCurrentlyTypingRef.current) {
      reportViolation({
        student_id: user?.id || 0,
        assignment_id: parseInt(assignmentId || '0'),
        violation_type: 'suspicious_activity',
        description: `Left page while typing for ${Math.round(timeSinceLastSwitch/1000)}s. Suspicious activity detected.`,
        time_away_seconds: Math.round(timeSinceLastSwitch / 1000),
        severity: 'medium'
      });
    }
    
    lastTabSwitchTimeRef.current = now;
    isCurrentlyTypingRef.current = false;
  };

  // Reset time tracking for text mode violations
  const resetTimeTrackingForTextMode = () => {
    console.log('🔄 RESETTING TIME TO 0 - Text added while away from page!');
    
    activeTimeRef.current = 0;
    startTimeRef.current = Date.now();
    lastActiveTimeRef.current = Date.now();
    setTimeSpent(0);
    setSeconds(0);
    
    if (timeSpentRef.current) {
      timeSpentRef.current.value = '0';
    }
    
    if (assignmentId) {
      localStorage.removeItem(`assignment_${assignmentId}_time`);
      localStorage.removeItem(`content_length_${assignmentId}`);
    }
    
    hasTypedRef.current = false;
    strictModeRef.current = false;
    isCurrentlyTypingRef.current = false;
    
    setShowViolationWarning(true);
    setViolationMessage('⚠️ TIME RESET TO 0! Text was added while you were away from the page. This is considered cheating.');
    
    setTimeout(() => {
      setShowViolationWarning(false);
      if (contentRef.current?.value && contentRef.current.value.length > 0) {
        hasTypedRef.current = true;
        strictModeRef.current = true;
        console.log('📝 Re-enabling strict mode after time reset');
      }
    }, 5000);
  };

  // Calculate time spent
  const calculateTimeSpent = () => {
    if (!isActive) return;
    
    const now = Date.now();
    const elapsedMilliseconds = now - lastActiveTimeRef.current;
    
    if (elapsedMilliseconds > 0) {
      const addedMinutes = elapsedMilliseconds / (1000 * 60);
      activeTimeRef.current += addedMinutes;
      lastActiveTimeRef.current = now;
      
      const totalMinutes = Math.floor(activeTimeRef.current);
      const remainingSeconds = Math.floor((activeTimeRef.current - totalMinutes) * 60);
      
      setTimeSpent(totalMinutes);
      setSeconds(remainingSeconds);
      
      if (timeSpentRef.current) {
        timeSpentRef.current.value = activeTimeRef.current.toFixed(2);
      }
      
      if (strictModeRef.current && hasTypedRef.current) {
        checkTextModeViolations();
      }
    }
  };

  // Update seconds counter
  const updateSecondsCounter = () => {
    if (!isActive) return;
    
    const now = Date.now();
    const elapsedSeconds = (now - lastActiveTimeRef.current) / 1000;
    
    if (elapsedSeconds >= 1) {
      activeTimeRef.current += elapsedSeconds / 60;
      lastActiveTimeRef.current = now;
      
      const totalMinutes = Math.floor(activeTimeRef.current);
      const remainingSeconds = Math.floor((activeTimeRef.current - totalMinutes) * 60);
      
      setTimeSpent(totalMinutes);
      setSeconds(remainingSeconds);
      
      if (timeSpentRef.current) {
        timeSpentRef.current.value = activeTimeRef.current.toFixed(2);
      }
      
      if (Math.floor(activeTimeRef.current * 60) % 30 === 0) {
        saveTimeToLocalStorage();
      }
    }
  };

  // Save time spent to localStorage
  const saveTimeToLocalStorage = () => {
    if (!assignmentId) return;
    
    try {
      const key = `assignment_${assignmentId}_time`;
      const timeData = {
        timeSpent: activeTimeRef.current,
        lastUpdate: Date.now(),
        assignmentId: assignmentId,
        pagePath: window.location.pathname,
        strictMode: strictModeRef.current,
        keystrokes: keystrokesCountRef.current,
        hasTyped: hasTypedRef.current,
        contentSnapshot: contentRef.current?.value || '',
        contentLength: contentRef.current?.value?.length || 0
      };
      localStorage.setItem(key, JSON.stringify(timeData));
    } catch (error) {
      console.error('Error saving time to localStorage:', error);
    }
  };

  // Load saved time from localStorage
  const loadTimeFromLocalStorage = () => {
    if (!assignmentId) return 0;
    
    try {
      const key = `assignment_${assignmentId}_time`;
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        const timeData = JSON.parse(savedData);
        
        if (timeData.assignmentId === assignmentId && timeData.pagePath === window.location.pathname) {
          const timeElapsed = timeData.timeSpent || 0;
          keystrokesCountRef.current = timeData.keystrokes || 0;
          hasTypedRef.current = timeData.hasTyped || false;
          strictModeRef.current = timeData.strictMode || false;
          
          if (timeData.contentSnapshot && contentRef.current && !contentRef.current.value) {
            contentRef.current.value = timeData.contentSnapshot;
          }
          
          return timeElapsed;
        } else {
          console.log('🔄 Different page detected, resetting time...');
          return 0;
        }
      }
    } catch (error) {
      console.error('Error loading time from localStorage:', error);
    }
    
    return 0;
  };

  // Reset time tracking
  const resetTimeTracking = () => {
    console.log('🔄 Resetting time tracking...');
    activeTimeRef.current = 0;
    startTimeRef.current = Date.now();
    lastActiveTimeRef.current = Date.now();
    keystrokesCountRef.current = 0;
    setTimeSpent(0);
    setSeconds(0);
    
    if (timeSpentRef.current) {
      timeSpentRef.current.value = '0';
    }
    
    if (assignmentId) {
      localStorage.removeItem(`assignment_${assignmentId}_time`);
      localStorage.removeItem(`content_length_${assignmentId}`);
    }
  };

  // Handle visibility change (tab/window switching)
  const handleVisibilityChange = () => {
    const now = Date.now();
    const timeSinceLastVisibilityChange = now - lastVisibilityChangeRef.current;
    
    if (document.hidden) {
      console.log('👋 Page hidden (switched to another app/tab)');
      setIsActive(false);
      
      if (hasTypedRef.current) {
        const currentLength = contentRef.current?.value?.length || 0;
        contentBeforeLeavingRef.current = currentLength;
        
        lastTabSwitchTimeRef.current = now;
        initialContentLengthRef.current = currentLength;
        isCurrentlyTypingRef.current = false;
        console.log('📝 Stored content length before leaving:', currentLength);
        
        timeWhenLeftRef.current = activeTimeRef.current;
        localStorage.setItem(`content_before_leaving_${assignmentId}`, currentLength.toString());
      }
      
      saveTimeToLocalStorage();
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (secondTimerRef.current) {
        clearInterval(secondTimerRef.current);
        secondTimerRef.current = null;
      }
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      
    } else {
      console.log('👋 Page visible (returned to page)');
      setIsActive(true);
      
      if (timeSinceLastVisibilityChange > 60000) {
        reportViolation({
          student_id: user?.id || 0,
          assignment_id: parseInt(assignmentId || '0'),
          violation_type: 'suspicious_activity',
          description: `Excessive time away from page: ${Math.round(timeSinceLastVisibilityChange/1000)}s. Highly suspicious activity.`,
          time_away_seconds: Math.round(timeSinceLastVisibilityChange / 1000),
          severity: 'high'
        });
      }
      
      if (hasTypedRef.current && timeSinceLastVisibilityChange > 1000) {
        handleTabSwitchDetection();
      }
      
      lastActiveTimeRef.current = Date.now();
      lastVisibilityChangeRef.current = now;
      
      startTimers();
    }
  };

  // Check if user navigated to a different page in the app
  const checkPageNavigation = () => {
    const currentPath = window.location.pathname;
    
    if (currentPath !== lastPagePathRef.current) {
      console.log(`🔄 Page navigation detected: ${lastPagePathRef.current} -> ${currentPath}`);
      
      if (lastPagePathRef.current.includes('/student/assignments/') && 
          !currentPath.includes('/student/assignments/')) {
        console.log('🚪 Leaving assignment page');
        
        if (hasTypedRef.current && contentRef.current?.value?.length > 50) {
          console.log('⚠️ Leaving text assignment page with unsaved work');
          reportViolation({
            student_id: user?.id || 0,
            assignment_id: parseInt(assignmentId || '0'),
            violation_type: 'suspicious_activity',
            description: 'Navigated away from assignment page while working on text submission. Suspicious behavior detected.',
            time_away_seconds: 0,
            severity: 'medium'
          });
        }
        
        resetTimeTracking();
      }
      
      lastPagePathRef.current = currentPath;
    }
  };

  // Start the timers
  const startTimers = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (secondTimerRef.current) {
      clearInterval(secondTimerRef.current);
    }
    if (excessiveInactivityTimerRef.current) {
      clearTimeout(excessiveInactivityTimerRef.current);
    }
    
    lastActiveTimeRef.current = Date.now();
    
    timerIntervalRef.current = setInterval(calculateTimeSpent, 10000);
    secondTimerRef.current = setInterval(updateSecondsCounter, 1000);
    
    if (strictModeRef.current && hasTypedRef.current) {
      if (violationCheckIntervalRef.current) {
        clearInterval(violationCheckIntervalRef.current);
      }
      violationCheckIntervalRef.current = setInterval(checkTextModeViolations, 30000);
      
      excessiveInactivityTimerRef.current = setTimeout(() => {
        if (strictModeRef.current && hasTypedRef.current && !document.hidden) {
          reportViolation({
            student_id: user?.id || 0,
            assignment_id: parseInt(assignmentId || '0'),
            violation_type: 'excessive_inactivity',
            description: 'Excessive inactivity detected (5+ minutes). Time tracking may be inaccurate.',
            time_away_seconds: 300,
            severity: 'medium'
          });
        }
      }, 300000);
    }
    
    startInactivityMonitoring();
  };

  // Start inactivity monitoring
  const startInactivityMonitoring = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      if (strictModeRef.current && hasTypedRef.current && !document.hidden) {
        console.log('⏰ Inactivity detected while in strict mode');
        lastTypingTimeRef.current = Date.now();
      }
    }, 30000);
  };

  // Handle page unload
  const handlePageUnload = () => {
    console.log('📤 Page unloading...');
    pageUnloadRef.current = true;
    
    if (strictModeRef.current && hasTypedRef.current) {
      checkTextModeViolations();
    }
    
    saveTimeToLocalStorage();
  };

  // Handle beforeunload
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    console.log('⚠️ Page about to unload...');
    
    if (strictModeRef.current && hasTypedRef.current) {
      checkTextModeViolations();
    }
    
    saveTimeToLocalStorage();
    
    if (contentRef.current?.value || fileRef.current?.files?.length || linkUrl) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };

  // Track typing for TEXT MODE
  const trackTypingActivity = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    keystrokesCountRef.current++;
    
    if (!hasTypedRef.current) {
      hasTypedRef.current = true;
      strictModeRef.current = true;
      typingStartTimeRef.current = Date.now();
      console.log('📝 First keystroke detected - Enabling STRICT MODE');
      
      setShowViolationWarning(true);
      setViolationMessage('⚠️ STRICT MODE ENABLED: You have started typing. Switching tabs/apps will reset your time to 0 if text is added while away!');
      
      setTimeout(() => {
        setShowViolationWarning(false);
      }, 10000);
      
      if (violationCheckIntervalRef.current) {
        clearInterval(violationCheckIntervalRef.current);
      }
      violationCheckIntervalRef.current = setInterval(checkTextModeViolations, 30000);
    }
    
    isCurrentlyTypingRef.current = true;
    lastTypingTimeRef.current = Date.now();
    lastFocusTimeRef.current = Date.now();
    
    if (excessiveInactivityTimerRef.current) {
      clearTimeout(excessiveInactivityTimerRef.current);
    }
    
    startInactivityMonitoring();
  };

  // Track content changes (for paste detection)
  const trackContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newLength = newContent.length;
    const oldLength = initialContentLengthRef.current;
    
    if (newLength > 0 && !hasTypedRef.current) {
      hasTypedRef.current = true;
      strictModeRef.current = true;
      typingStartTimeRef.current = Date.now();
      console.log('📝 Content detected - Enabling STRICT MODE');
    }
    
    if (strictModeRef.current && hasTypedRef.current) {
      const now = Date.now();
      const timeSinceLastAction = now - lastTypingTimeRef.current;
      
      const pasteDetection = detectLargePaste(contentSnapshotRef.current, newContent);
      
      if (pasteDetection.isLargePaste && timeSinceLastAction < 2000) {
        pasteDetectionRef.current = true;
        
        if (pasteDetection.addedLength > 500) {
          reportViolation({
            student_id: user?.id || 0,
            assignment_id: parseInt(assignmentId || '0'),
            violation_type: 'paste_detected',
            description: `Extremely large copy-paste detected: ${pasteDetection.addedLength} characters added at once. High likelihood of cheating.`,
            time_away_seconds: 0,
            severity: 'high',
            paste_content_length: pasteDetection.addedLength
          });
        }
      }
      
      if (pasteDetection.addedLength > 200) {
        const aiDetection = detectAIContent(newContent);
        if (aiDetection.isSuspicious) {
          reportViolation({
            student_id: user?.id || 0,
            assignment_id: parseInt(assignmentId || '0'),
            violation_type: 'ai_content_detected',
            description: `AI-generated content pattern detected in pasted text. Similarity score: ${(aiDetection.score * 100).toFixed(1)}%.`,
            time_away_seconds: 0,
            severity: 'high',
            ai_similarity_score: aiDetection.score
          });
        }
      }
    }
    
    contentSnapshotRef.current = newContent;
    initialContentLengthRef.current = newLength;
    lastTypingTimeRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    startInactivityMonitoring();
    
    if (excessiveInactivityTimerRef.current) {
      clearTimeout(excessiveInactivityTimerRef.current);
    }
  };

  // Check if assignment is text-based
  const checkIfTextAssignment = (description: string | null): boolean => {
    if (!description) return false;
    
    const descLower = description.toLowerCase();
    
    if (
      descLower.includes('write') || 
      descLower.includes('essay') || 
      descLower.includes('composition') ||
      descLower.includes('type') ||
      descLower.includes('text') ||
      descLower.includes('describe') ||
      descLower.includes('explain') ||
      descLower.includes('discuss') ||
      descLower.includes('analyze') ||
      (descLower.includes('answer') && !descLower.includes('upload'))
    ) {
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/login');
      return;
    }
    
    lastPagePathRef.current = window.location.pathname;
    lastVisibilityChangeRef.current = Date.now();
    loadAssignmentData();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      checkPageNavigation();
    };
    
    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      checkPageNavigation();
    };
    
    startTimers();
    
    return () => {
      console.log('🧹 Cleaning up...');
      
      if (!pageUnloadRef.current) {
        saveTimeToLocalStorage();
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (secondTimerRef.current) {
        clearInterval(secondTimerRef.current);
      }
      if (violationCheckIntervalRef.current) {
        clearInterval(violationCheckIntervalRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (excessiveInactivityTimerRef.current) {
        clearTimeout(excessiveInactivityTimerRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [user, assignmentId]);

  // Load student schedule
  const loadSchedules = async (): Promise<Schedule[]> => {
    try {
      console.log('📅 Loading student schedule...');
      const response = await apiClient.get('/students/me/schedule');
      console.log('✅ Student schedule loaded:', response.data);
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('❌ Error loading student schedule:', error);
      return [];
    }
  };

  // Get teacher name from schedules
  const getTeacherNameFromSchedules = (classId: number): string => {
    if (!schedules || schedules.length === 0) return 'Teacher';
    const schedule = schedules.find(s => s.class_id === classId);
    return schedule?.teacher_name || schedule?.teacher_full_name || 'Teacher';
  };

  // Get class name from schedules
  const getClassNameFromSchedules = (classId: number): string => {
    if (!schedules || schedules.length === 0) return `Class ${classId}`;
    const schedule = schedules.find(s => s.class_id === classId);
    return schedule?.class_name || `Class ${classId}`;
  };

  // Get class code from schedules
  const getClassCodeFromSchedules = (classId: number): string => {
    if (!schedules || schedules.length === 0) return '';
    const schedule = schedules.find(s => s.class_id === classId);
    return schedule?.class_code || '';
  };

  // Load student assignment
  const loadStudentAssignment = async (): Promise<Assignment | null> => {
    try {
      console.log('📝 Loading student assignment...');
      
      if (!assignmentId) throw new Error('Assignment ID is required');
      const assignmentIdNum = parseInt(assignmentId);
      if (isNaN(assignmentIdNum)) throw new Error('Invalid assignment ID');
      
      const endpoints = [
        `/students/me/assignments/${assignmentIdNum}`,
        `/assignments/student/${assignmentIdNum}`,
        `/assignments/${assignmentIdNum}`
      ];
      
      let assignmentData: any = null;
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);
          const response = await apiClient.get(endpoint);
          assignmentData = response.data;
          console.log(`✅ Success with endpoint: ${endpoint}`, assignmentData);
          break;
        } catch (endpointError: any) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
          lastError = endpointError;
          if (endpointError.response?.status === 403) continue;
          if (endpointError.response?.status !== 403) throw endpointError;
        }
      }
      
      if (!assignmentData) throw lastError || new Error('Failed to load assignment');
      
      if (!assignmentData.id || !assignmentData.name || !assignmentData.class_id) {
        throw new Error('Invalid assignment data received');
      }
      
      const assignment: Assignment = {
        id: assignmentData.id,
        name: assignmentData.name,
        description: assignmentData.description,
        class_id: assignmentData.class_id,
        creator_id: assignmentData.creator_id,
        created_at: assignmentData.created_at,
        class_name: assignmentData.class_name,
        class_code: assignmentData.class_code,
        teacher_name: assignmentData.teacher_name,
        due_date: assignmentData.due_date
      };
      
      // Get class info if missing
      if (!assignment.class_name && assignment.class_id) {
        try {
          const classResponse = await apiClient.get(`/classes/${assignment.class_id}`);
          assignment.class_name = classResponse.data.name;
          assignment.class_code = classResponse.data.code;
          if (classResponse.data.teacher_name) {
            assignment.teacher_name = classResponse.data.teacher_name;
          } else if (classResponse.data.teacher) {
            assignment.teacher_name = classResponse.data.teacher.username;
          }
        } catch (classError) {
          console.warn('Could not load class info:', classError);
        }
      }
      
      return assignment;
      
    } catch (error: any) {
      console.error('❌ Error loading student assignment:', error);
      throw error;
    }
  };

  // Load student submission
  const loadStudentSubmission = async (): Promise<Submission | null> => {
    try {
      console.log('📤 Loading student submission...');
      
      if (!assignmentId) return null;
      const assignmentIdNum = parseInt(assignmentId);
      if (isNaN(assignmentIdNum)) return null;
      
      const endpoints = [
        `/submissions/assignment/${assignmentIdNum}/student`,
        `/students/me/submissions/${assignmentIdNum}`,
        `/submissions/student/${assignmentIdNum}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint);
          if (response.data) {
            console.log('✅ Submission found at:', endpoint);
            const submissionData = response.data;
            return {
              id: submissionData.id,
              assignment_id: submissionData.assignment_id,
              student_id: submissionData.student_id,
              content: submissionData.content || '',
              file_path: submissionData.file_path,
              submitted_at: submissionData.submitted_at,
              grade: submissionData.grade,
              feedback: submissionData.feedback,
              is_graded: submissionData.grade !== null && submissionData.grade !== undefined,
              file_name: submissionData.file_name,
              time_spent_minutes: submissionData.time_spent_minutes,
              link_url: submissionData.link_url || ''
            };
          }
        } catch (endpointError: any) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.message);
          if (endpointError.response?.status === 404) {
            console.log('ℹ️ No submission found (404)');
            return null;
          }
          if (endpointError.response?.status === 403) continue;
        }
      }
      
      console.log('ℹ️ No submission found after trying all endpoints');
      return null;
      
    } catch (error: any) {
      console.error('❌ Error loading submission:', error);
      return null;
    }
  };

  // Load assignment data
  const loadAssignmentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Loading assignment data for ID:', assignmentId);

      if (!assignmentId) {
        setError('Assignment ID is required');
        setIsLoading(false);
        return;
      }

      const schedulesData = await loadSchedules();
      setSchedules(schedulesData);

      const assignmentData = await loadStudentAssignment();
      if (!assignmentData) {
        throw new Error('Assignment not found or no permission.');
      }

      // Enrich assignment with schedule data
      if (!assignmentData.teacher_name) {
        assignmentData.teacher_name = getTeacherNameFromSchedules(assignmentData.class_id);
      }
      if (!assignmentData.class_name) {
        assignmentData.class_name = getClassNameFromSchedules(assignmentData.class_id);
      }
      if (!assignmentData.class_code) {
        assignmentData.class_code = getClassCodeFromSchedules(assignmentData.class_id);
      }

      setAssignment(assignmentData);

      const isTextAssignment = checkIfTextAssignment(assignmentData.description);
      if (isTextAssignment) {
        console.log('📝 This appears to be a text-based assignment');
      }

      const submissionData = await loadStudentSubmission();
      if (submissionData) {
        setSubmission(submissionData);
        if (contentRef.current) {
          contentRef.current.value = submissionData.content || '';
          contentSnapshotRef.current = submissionData.content || '';
          if (submissionData.content && submissionData.content.length > 0) {
            hasTypedRef.current = true;
            strictModeRef.current = true;
            console.log('📝 Existing submission found - Enabling STRICT MODE');
          }
        }
        if (submissionData.link_url) {
          setLinkUrl(submissionData.link_url);
        }
      }

      // Load time from localStorage
      const savedTime = loadTimeFromLocalStorage();
      activeTimeRef.current = savedTime;
      
      const totalMinutes = Math.floor(savedTime);
      const remainingSeconds = Math.floor((savedTime - totalMinutes) * 60);
      
      setTimeSpent(totalMinutes);
      setSeconds(remainingSeconds);
      
      if (timeSpentRef.current) {
        timeSpentRef.current.value = savedTime.toFixed(2);
      }

      // Load violations
      try {
        const savedViolations = localStorage.getItem(`assignment_${assignmentId}_violations`);
        if (savedViolations) {
          setViolations(JSON.parse(savedViolations));
        }
      } catch (e) {
        console.error('Error loading violations:', e);
      }

      // Load content length from localStorage if exists
      try {
        const savedContentLength = localStorage.getItem(`content_before_leaving_${assignmentId}`);
        if (savedContentLength) {
          contentBeforeLeavingRef.current = parseInt(savedContentLength);
        }
      } catch (e) {
        console.error('Error loading content length:', e);
      }

    } catch (error: any) {
      console.error('❌ Error in loadAssignmentData:', error);
      
      let errorMessage = 'Failed to load assignment. Please try again.';
      
      if (error.message) errorMessage = error.message;
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.response?.status === 403) errorMessage = 'No permission to view this assignment.';
      else if (error.response?.status === 404) errorMessage = 'Assignment not found.';
      
      setError(errorMessage);
      
      // Fallback to localStorage
      try {
        const savedAssignments = localStorage.getItem('student_assignments');
        if (savedAssignments && assignmentId) {
          const assignments = JSON.parse(savedAssignments);
          const fallbackAssignment = assignments.find((a: any) => a.id === parseInt(assignmentId));
          if (fallbackAssignment) {
            console.log('🔄 Using fallback assignment data');
            setAssignment(fallbackAssignment);
            setError(null);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        setError('Invalid file type. Please upload PDF, DOC, DOCX, TXT, or image files only.');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      
      setSelectedFileName(file.name);
      setError(null);
    } else {
      setSelectedFileName('');
    }
  };

  const handleRemoveFile = () => {
    if (fileRef.current) {
      fileRef.current.value = '';
      setSelectedFileName('');
    }
  };

  const handleRemoveLink = () => {
    setLinkUrl('');
  };

  const handleSubmitAssignment = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const content = contentRef.current?.value.trim() || '';
      const file = fileRef.current?.files?.[0];
      const link = linkUrl.trim();
      
      const timeSpentValue = parseFloat(activeTimeRef.current.toFixed(2));

      // Check if at least one submission method is provided
      if (!content && !file && !link) {
        setError('Please provide either text content, upload a file, or submit a link');
        return;
      }

      // Validate link if provided
      if (link && !isValidUrl(link)) {
        setError('Please enter a valid URL (must start with http:// or https://)');
        return;
      }

      if (!assignmentId) {
        setError('Assignment ID is required');
        return;
      }

      const assignmentIdNum = parseInt(assignmentId);
      if (isNaN(assignmentIdNum)) {
        setError('Invalid assignment ID');
        return;
      }

      console.log(`⏱️ Submitting with ${timeSpentValue} minutes tracked`);

      // Prepare submission data
      let submissionData: any = {
        assignment_id: assignmentIdNum,
        time_spent_minutes: timeSpentValue
      };
      
      if (content) {
        submissionData.content = content;
      }
      
      if (link) {
        submissionData.link_url = link;
      }

      // For file uploads
      if (file) {
        const formData = new FormData();
        formData.append('assignment_id', assignmentIdNum.toString());
        formData.append('time_spent_minutes', timeSpentValue.toString());
        
        if (content) {
          formData.append('content', content);
        }
        
        if (link) {
          formData.append('link_url', link);
        }
        
        if (file) {
          formData.append('photo', file);
        }

        let response;
        if (submission?.id) {
          console.log('📝 Updating submission with file:', submission.id);
          response = await apiClient.put(`/submissions/${submission.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setSuccess('Assignment updated successfully!');
        } else {
          console.log('📝 Creating new submission with file');
          response = await apiClient.post('/submissions/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setSuccess('Assignment submitted successfully!');
        }

        const newSubmission = response.data;
        setSubmission(newSubmission);
        
      } else {
        // For text/link only submissions
        let response;
        if (submission?.id) {
          console.log('📝 Updating text/link submission:', submission.id);
          response = await apiClient.put(`/submissions/${submission.id}`, submissionData);
          setSuccess('Assignment updated successfully!');
        } else {
          console.log('📝 Creating new text/link submission');
          response = await apiClient.post('/submissions/', submissionData);
          setSuccess('Assignment submitted successfully!');
        }

        const newSubmission = response.data;
        setSubmission(newSubmission);
      }

      // Clear localStorage after submission
      if (assignmentId) {
        localStorage.removeItem(`assignment_${assignmentId}_time`);
        localStorage.removeItem(`assignment_${assignmentId}_violations`);
        localStorage.removeItem(`content_length_${assignmentId}`);
        localStorage.removeItem(`content_before_leaving_${assignmentId}`);
      }

      // Update localStorage cache
      try {
        const savedSubmissions = localStorage.getItem('student_submissions') || '[]';
        const submissions = JSON.parse(savedSubmissions);
        const filteredSubmissions = submissions.filter((s: any) => s.assignment_id !== assignmentIdNum);
        
        const updatedSubmission = {
          assignment_id: assignmentIdNum,
          content: content,
          link_url: link,
          time_spent_minutes: timeSpentValue,
          submitted_at: new Date().toISOString()
        };
        
        localStorage.setItem('student_submissions', JSON.stringify([
          ...filteredSubmissions,
          updatedSubmission
        ]));
      } catch (cacheError) {
        console.warn('Failed to update localStorage cache:', cacheError);
      }

      // Clear form
      if (contentRef.current) contentRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
      setSelectedFileName('');
      setLinkUrl('');
      
      // Reset time tracking
      resetTimeTracking();
      // Reset typing flags
      hasTypedRef.current = false;
      strictModeRef.current = false;
      isCurrentlyTypingRef.current = false;
      contentBeforeLeavingRef.current = 0;
      contentSnapshotRef.current = '';
      aiContentDetectionRef.current = false;
      largePasteCountRef.current = 0;
      tabSwitchHistoryRef.current = [];

    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      
      let errorMessage = 'Failed to submit assignment. Please try again.';
      
      if (error.response?.status === 403) errorMessage = 'No permission to submit.';
      else if (error.response?.status === 400) errorMessage = error.response.data?.detail || 'Invalid data.';
      else if (error.response?.status === 409) errorMessage = 'Already submitted.';
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubmit = async () => {
    if (!submission?.id || !window.confirm('Are you sure you want to unsubmit this assignment?')) {
      return;
    }

    try {
      await apiClient.delete(`/submissions/${submission.id}`);
      
      setSubmission(null);
      setSelectedFileName('');
      setLinkUrl('');
      resetTimeTracking();
      // Reset typing flags
      hasTypedRef.current = false;
      strictModeRef.current = false;
      isCurrentlyTypingRef.current = false;
      contentBeforeLeavingRef.current = 0;
      contentSnapshotRef.current = '';
      aiContentDetectionRef.current = false;
      largePasteCountRef.current = 0;
      tabSwitchHistoryRef.current = [];
      setSuccess('Assignment unsubmitted successfully!');
      
      // Update cache
      try {
        const savedSubmissions = localStorage.getItem('student_submissions') || '[]';
        const submissions = JSON.parse(savedSubmissions);
        const filteredSubmissions = submissions.filter((s: any) => s.id !== submission.id);
        localStorage.setItem('student_submissions', JSON.stringify(filteredSubmissions));
      } catch (cacheError) {
        console.warn('Failed to update cache:', cacheError);
      }

    } catch (error: any) {
      console.error('Error unsubmitting assignment:', error);
      
      let errorMessage = 'Failed to unsubmit assignment. Please try again.';
      if (error.response?.status === 403) errorMessage = 'No permission to unsubmit.';
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      
      setError(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (grade >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const downloadFile = async () => {
    if (!submission?.file_path || !submission.id) return;
    
    try {
      const response = await apiClient.get(`/submissions/${submission.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.file_name || 'submission_file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      
      try {
        const fileUrl = `${API_BASE_URL}${submission.file_path}`;
        window.open(fileUrl, '_blank');
      } catch (fallbackError) {
        setError('Failed to download file. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/student/assignments')}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                title="Go back to assignments"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Assignments
              </button>
              <button
                onClick={loadAssignmentData}
                className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                title="Try loading assignment again"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-blue-500/20 rounded-xl blur-sm"></div>
              <img 
                src={plmunLogo} 
                alt="PLMun Logo" 
                className="relative w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Assignment</h1>
              <p className="text-xs text-gray-600">Submit your work</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm cursor-pointer"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 013-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
              title="Toggle menu"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <DynamicHeader 
            title={assignment?.name || "Assignment"}
            subtitle="Submit your work and track your progress"
            showBackButton={true}
            backTo="/student/assignments"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Violation Warning */}
            {showViolationWarning && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-4 shadow-lg animate-pulse">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-800">VIOLATION ALERT</h3>
                    <p className="text-sm text-red-700 mt-1">{violationMessage}</p>
                  </div>
                  <button
                    onClick={() => setShowViolationWarning(false)}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                    title="Dismiss warning"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && !showViolationWarning && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-700">Error</h3>
                    <p className="text-sm text-gray-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                    title="Dismiss error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-700">Success</h3>
                    <p className="text-sm text-gray-600 mt-1">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mb-6 overflow-hidden">
              {/* Assignment Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{assignment?.name}</h2>
                      {strictModeRef.current && hasTypedRef.current && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-300">
                          ⚠️ STRICT MODE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Teacher: {assignment?.teacher_name || 'N/A'}
                      </div>
                      {assignment?.class_name && (
                        <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Code: {assignment.class_name}
                          {assignment.class_code && ` (${assignment.class_code})`}
                        </div>
                      )}
                      <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Created: {assignment?.created_at ? formatDate(assignment.created_at) : 'N/A'}
                      </div>
                      {assignment?.due_date && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 text-yellow-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Due: {formatDate(assignment.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  {submission && submission.grade !== null && submission.grade !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-xl border font-semibold ${getGradeColor(submission.grade)}`}>
                        Grade: {submission.grade}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Assignment Content */}
              <div className="p-6">
                {/* Assignment Description */}
                <div className="prose max-w-none mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Description
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {assignment?.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Time Spent Display with Mode Info */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time Spent - Student Engagement Insights AI Smart Tracking
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {isActive ? '⏱️ Live Tracking' : '⏸️ Tracking Paused'}
                      </span>
                      {strictModeRef.current && hasTypedRef.current && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                          STRICT MODE
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className={`border-2 rounded-2xl p-6 shadow-sm ${
                        strictModeRef.current && hasTypedRef.current
                          ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300' 
                          : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
                      }`}>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <div className={`text-4xl font-bold ${strictModeRef.current && hasTypedRef.current ? 'text-red-700' : 'text-blue-700'}`}>
                              {timeSpent}
                            </div>
                            <div className={`text-2xl font-semibold ${strictModeRef.current && hasTypedRef.current ? 'text-red-700' : 'text-blue-700'}`}>
                              m
                            </div>
                            <div className={`text-4xl font-bold ${strictModeRef.current && hasTypedRef.current ? 'text-red-700' : 'text-blue-700'}`}>
                              {seconds.toString().padStart(2, '0')}
                            </div>
                            <div className={`text-2xl font-semibold ${strictModeRef.current && hasTypedRef.current ? 'text-red-700' : 'text-blue-700'}`}>
                              s
                            </div>
                          </div>
                          <div className={`text-lg font-medium mb-1 ${strictModeRef.current && hasTypedRef.current ? 'text-red-600' : 'text-blue-600'}`}>
                            {strictModeRef.current && hasTypedRef.current ? 'Strict Anti-Cheat Mode' : 'Normal Time Tracker'}
                          </div>
                          <div className={`text-xs ${strictModeRef.current && hasTypedRef.current ? 'text-red-500' : 'text-blue-500'}`}>
                            {strictModeRef.current && hasTypedRef.current ? '⚡ Time resets if you leave while typing!' : '⚡ Normal time tracking'}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                          <div className={`text-xs font-medium ${strictModeRef.current && hasTypedRef.current ? 'text-red-600' : 'text-blue-600'}`}>
                            {isActive 
                              ? `Working... ${timeSpent}m ${seconds}s` 
                              : strictModeRef.current && hasTypedRef.current
                                ? 'PAUSED - Time will reset to 0 if text added while away!' 
                                : 'Paused - switched tab/window'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">
                            {strictModeRef.current && hasTypedRef.current ? 'STRICT MODE RULES:' : 'NORMAL MODE RULES:'}
                          </span>
                        </div>
                        <div className="space-y-2 pl-5">
                          {strictModeRef.current && hasTypedRef.current ? (
                            <>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span><strong>You have typed text</strong> - Strict monitoring enabled</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span>Switching tabs/apps <strong>pauses time</strong></span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span>If ANY text is added while away, time <strong>RESETS TO 0</strong> immediately</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span>Multiple tab switches (3+) within <strong>15 seconds</strong> = <strong>HIGH SEVERITY</strong></span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span>Away for more than 60s = <strong>HIGH SEVERITY</strong></span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                                <span><strong>Stay on this page while typing!</strong></span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                                <span>No text typed yet - Normal tracking</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                                <span>Time pauses when switching tabs/apps</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                                <span>No strict anti-cheat measures</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></div>
                                <span>Perfect for file uploads or before typing</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></div>
                                <span><strong>Warning:</strong> Once you start typing, strict mode activates!</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Hidden input for form submission */}
                      <input
                        id="time-spent"
                        ref={timeSpentRef}
                        type="hidden"
                        value={activeTimeRef.current.toFixed(2)}
                      />
                      
                      {/* Violation Stats */}
                      {violations.length > 0 && (
                        <div className="text-sm bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                          <div className="flex items-center gap-1 mb-2">
                            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="font-medium text-yellow-800">Violation Alerts: {violations.length}</span>
                          </div>
                          <div className="text-xs text-yellow-700">
                            <span className="font-semibold text-red-600">
                              {violations.filter(v => v.severity === 'high').length} HIGH
                            </span>, 
                            <span className="font-medium text-yellow-600">
                              {" "}{violations.filter(v => v.severity === 'medium').length} MEDIUM
                            </span>,
                            <span className="text-blue-600">
                              {" "}{violations.filter(v => v.severity === 'low').length} LOW
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`mt-4 rounded-xl p-3 ${
                    strictModeRef.current && hasTypedRef.current
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200' 
                      : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        strictModeRef.current && hasTypedRef.current ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <svg className={`w-4 h-4 ${strictModeRef.current && hasTypedRef.current ? 'text-red-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${strictModeRef.current && hasTypedRef.current ? 'text-red-800' : 'text-blue-800'}`}>
                          {strictModeRef.current && hasTypedRef.current ? 'STRICT ANTI-CHEAT MODE ACTIVE' : 'NORMAL TRACKING MODE'}
                        </p>
                        <p className={`text-xs ${strictModeRef.current && hasTypedRef.current ? 'text-red-600' : 'text-blue-600'}`}>
                          {strictModeRef.current && hasTypedRef.current 
                            ? 'You have started typing. Do not switch tabs/apps while working. If text is added while you are away, time will reset to 0 and a HIGH severity violation will be recorded. Multiple tab switches within 15 seconds trigger HIGH severity alerts.'
                            : 'No text typed yet. You can safely switch tabs/apps. Once you start typing, strict anti-cheat mode will activate with HIGH severity monitoring.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Existing Submission Display */}
                {submission && (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Your Submission
                    </h3>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-sm text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200">
                          Submitted: {submission.submitted_at ? formatDate(submission.submitted_at) : 'N/A'}
                        </span>
                        {submission.time_spent_minutes && (
                          <span className="text-sm text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200">
                            ⏱️ Time Spent: {Math.floor(submission.time_spent_minutes)}m {Math.round((submission.time_spent_minutes - Math.floor(submission.time_spent_minutes)) * 60)}s
                          </span>
                        )}
                        {violations.length > 0 && (
                          <span className={`text-sm px-3 py-1 rounded-full border font-medium ${
                            violations.filter(v => v.severity === 'high').length > 0
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : violations.filter(v => v.severity === 'medium').length > 0
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            ⚠️ {violations.length} Violation{violations.length > 1 ? 's' : ''}
                            {violations.filter(v => v.severity === 'high').length > 0 && ` (${violations.filter(v => v.severity === 'high').length} HIGH)`}
                          </span>
                        )}
                        {submission.is_graded && (
                          <div className="flex items-center gap-2">
                            {submission.feedback && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full border border-purple-200">
                                Feedback Provided
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {submission.content && (
                        <div className="text-sm text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-200">
                          <strong className="text-blue-900">Content:</strong> 
                          <div className="mt-1 whitespace-pre-wrap">{submission.content}</div>
                        </div>
                      )}
                      {submission.link_url && (
                        <div className="text-sm text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-200">
                          <strong className="text-blue-900">Link:</strong> 
                          <div className="mt-1">
                            <a href={submission.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all">
                              {submission.link_url}
                            </a>
                          </div>
                        </div>
                      )}
                      {submission.file_path && (
                        <div className="flex items-center justify-between text-sm text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{submission.file_name || 'Uploaded file'}</span>
                          </div>
                          <button
                            onClick={downloadFile}
                            className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                            title="Download submitted file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        </div>
                      )}
                      {submission.feedback && (
                        <div className="text-sm text-purple-800 bg-white/50 p-3 rounded-xl border border-purple-200">
                          <strong className="text-purple-900">Teacher Feedback:</strong> 
                          <div className="mt-1 whitespace-pre-wrap">{submission.feedback}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submission Form */}
                <div className="space-y-6">
                  <div>
                    <label htmlFor="assignment-content" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {strictModeRef.current && hasTypedRef.current ? 'Your Work (STRICT MODE - Stay on this page!)' : 'Your Work'}
                    </label>
                    <textarea
                      id="assignment-content"
                      ref={contentRef}
                      rows={8}
                      className="w-full px-4 py-4 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 shadow-sm"
                      placeholder={strictModeRef.current && hasTypedRef.current 
                        ? "⚠️ WARNING: Do not switch tabs/apps while typing! Time will reset to 0 if text is added while away." 
                        : "Type your assignment submission here... (You can also upload a file or submit a link below)"
                      }
                      defaultValue={submission?.content || ''}
                      onKeyDown={trackTypingActivity}
                      onChange={trackContentChange}
                      onFocus={() => {
                        if (strictModeRef.current && hasTypedRef.current) {
                          isCurrentlyTypingRef.current = true;
                        }
                        lastFocusTimeRef.current = Date.now();
                      }}
                      onBlur={() => {
                        if (strictModeRef.current && hasTypedRef.current) {
                          isCurrentlyTypingRef.current = false;
                        }
                      }}
                    />
                    {strictModeRef.current && hasTypedRef.current && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                        ⚠️ <strong>Strict Mode Active:</strong> Do not switch tabs/apps while typing. If text is added while you are away, time will reset to <strong>0</strong> and HIGH severity violation will be recorded.
                      </div>
                    )}
                    {!hasTypedRef.current && (
                      <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                        💡 <strong>Tip:</strong> You can still browse other tabs/apps. Strict mode will only activate once you start typing.
                      </div>
                    )}
                  </div>
                  
                  {/* Link Submission */}
                  <div>
                    <label htmlFor="assignment-link" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Submit Link (Optional)
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          id="assignment-link"
                          ref={linkRef}
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://drive.google.com/... or https://docs.google.com/... or any valid URL"
                          className="flex-1 px-4 py-4 bg-purple-50 border-2 border-purple-300 rounded-2xl text-gray-900 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                        />
                        {linkUrl && (
                          <button
                            onClick={handleRemoveLink}
                            className="p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition-all duration-200 cursor-pointer"
                            title="Remove link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {linkUrl && (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-green-700 text-sm font-medium truncate">{linkUrl}</span>
                          </div>
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm"
                            title="Open link in new tab"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open
                          </a>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        Submit links to Google Drive, Google Docs, Dropbox, GitHub, or any other cloud storage. Must start with http:// or https://
                      </p>
                    </div>
                  </div>
                  
                  {/* File Upload */}
                  <div>
                    <label htmlFor="assignment-file" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload File (Optional)
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            id="assignment-file"
                            ref={fileRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                          />
                          <div className="w-full px-4 py-4 bg-yellow-50 border-2 border-yellow-300 rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 shadow-sm hover:bg-yellow-100 hover:border-yellow-400 cursor-pointer flex items-center justify-center gap-2">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-yellow-700 font-medium">Browse Files</span>
                          </div>
                        </label>
                      </div>
                      
                      {selectedFileName && (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-green-700 text-sm font-medium truncate">{selectedFileName}</span>
                          </div>
                          <button
                            onClick={handleRemoveFile}
                            className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Remove selected file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max: 10MB)
                      </p>
                    </div>
                  </div>

                  {/* Submission Instructions */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submission Instructions
                    </h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                        <span>You can submit using <strong>any one</strong> of the three methods above (Text, Link, or File)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                        <span>Submit multiple methods for additional context if needed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                        <span>Error will only appear if <strong>all three fields are empty</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => navigate('/student/assignments')}
                    className="px-4 sm:px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                    title="Go back to assignments list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="whitespace-nowrap">Back to Assignments</span>
                  </button>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {submission && (
                      <button
                        onClick={handleUnsubmit}
                        className="px-4 sm:px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm text-sm sm:text-base flex-1 sm:flex-none cursor-pointer"
                        disabled={isSubmitting}
                        title="Unsubmit this assignment"
                      >
                        Unsubmit
                      </button>
                    )}
                    
                    <button
                      onClick={handleSubmitAssignment}
                      disabled={isSubmitting}
                      className="px-4 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
                      title={submission ? "Update your submission" : "Submit your assignment"}
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="whitespace-nowrap">
                        {isSubmitting 
                          ? (submission ? 'Updating...' : 'Submitting...') 
                          : (submission ? 'Update Submission' : 'Submit Assignment')
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Violations Summary (Collapsible) */}
            {violations.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Violation History ({violations.length} records)
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-sm">
                      <span className="font-bold text-red-700">{violations.filter(v => v.severity === 'high').length} HIGH</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium text-yellow-700">{violations.filter(v => v.severity === 'medium').length} MEDIUM</span>
                      <span className="mx-2">•</span>
                      <span className="text-blue-700">{violations.filter(v => v.severity === 'low').length} LOW</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {violations.map((violation, index) => (
                      <div key={index} className={`p-3 rounded-xl border ${
                        violation.severity === 'high' 
                          ? 'bg-red-50 border-red-200' 
                          : violation.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                violation.severity === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : violation.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {violation.severity === 'high' ? '🔴 HIGH' : violation.severity === 'medium' ? '🟡 MEDIUM' : '🔵 LOW'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                violation.violation_type === 'ai_content_detected' || 
                                violation.violation_type === 'paste_detected'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {violation.violation_type.toUpperCase().replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(violation.detected_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{violation.description}</p>
                            {violation.time_away_seconds > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                ⏱️ Time away: {violation.time_away_seconds}s
                                {violation.content_added_during_absence && 
                                  ` • 📝 Text added: ${violation.content_added_during_absence} chars`
                                }
                                {violation.paste_content_length && 
                                  ` • 📋 Paste size: ${violation.paste_content_length} chars`
                                }
                                {violation.ai_similarity_score && 
                                  ` • 🤖 AI similarity: ${(violation.ai_similarity_score * 100).toFixed(1)}%`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        <strong>HIGH Severity</strong> = Text added while away, multiple tab switches (3+ within 15s), long absences, AI content, or large copy-paste
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentAssignmentPage;