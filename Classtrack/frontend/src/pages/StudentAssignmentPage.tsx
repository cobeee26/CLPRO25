import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DynamicHeader from '../components/DynamicHeader';
import Sidebar from '../components/Sidebar';
import { useUser } from '../contexts/UserContext';
import plmunLogo from '../assets/images/PLMUNLOGO.png';
import Swal from 'sweetalert2';
import { authService } from '../services/authService';

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
  teacher_full_name?: string;
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

interface ViolationResponse {
  id?: number;
  student_id: number;
  assignment_id: number;
  violation_type: string;
  description: string;
  detected_at: string;
  time_away_seconds: number;
  severity: string;
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
  
  const startTimeRef = useRef<number>(Date.now());
  const activeTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const secondTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const pageUnloadRef = useRef<boolean>(false);
  const lastPagePathRef = useRef<string>(window.location.pathname);
  
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
  
  const shouldStopTrackingRef = useRef<boolean>(false);
  const isTextareaFocusedRef = useRef<boolean>(false);
  const initialLoadRef = useRef<boolean>(true);

  const handleLogout = () => {
  
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your account.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      backdrop: true
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          localStorage.clear();
          window.location.href = '/login';
        } catch (error) {
          window.location.href = '/login';
        }
      }
    });
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

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

  const checkExcessiveTabSwitching = (currentTime: number): boolean => {
    tabSwitchHistoryRef.current.push(currentTime);
    
    const fifteenSecondsAgo = currentTime - tabSwitchWindowRef.current;
    tabSwitchHistoryRef.current = tabSwitchHistoryRef.current.filter(time => time > fifteenSecondsAgo);
    
    if (tabSwitchHistoryRef.current.length >= 3) {
      return true;
    }
    
    return false;
  };

  const checkExcessiveInactivity = (): boolean => {
    const now = Date.now();
    const timeSinceLastAction = now - Math.max(lastTypingTimeRef.current, lastFocusTimeRef.current);
    
    if (strictModeRef.current && hasTypedRef.current && timeSinceLastAction > 300000) {
      return true;
    }
    
    return false;
  };

  const convertToViolation = (violationResponse: ViolationResponse): Violation => {
    const violationType = violationResponse.violation_type as Violation['violation_type'];
    const severity = violationResponse.severity as Violation['severity'];
    
    return {
      id: violationResponse.id,
      student_id: violationResponse.student_id,
      assignment_id: violationResponse.assignment_id,
      violation_type: violationType,
      description: violationResponse.description,
      detected_at: violationResponse.detected_at,
      time_away_seconds: violationResponse.time_away_seconds,
      severity: severity,
      content_added_during_absence: violationResponse.content_added_during_absence,
      ai_similarity_score: violationResponse.ai_similarity_score,
      paste_content_length: violationResponse.paste_content_length
    };
  };

  const reportViolation = async (violationData: Omit<Violation, 'id' | 'detected_at'>) => {
    if (!user || !assignmentId || shouldStopTrackingRef.current || !isTextareaFocusedRef.current) return;
    
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
        await authService.createViolation(violation);
        console.log('✅ Violation reported to server');
      } catch (apiError) {
        console.warn('⚠️ Could not send violation to server, stored locally');
      }
      
    } catch (error) {
      console.error('Error reporting violation:', error);
    }
  };

  const checkTextModeViolations = () => {
    if (!strictModeRef.current || !assignmentId || !user || shouldStopTrackingRef.current || !isTextareaFocusedRef.current) return;
    
    const now = Date.now();
    const content = contentRef.current?.value || '';
    const currentLength = content.length;
    
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
        if (strictModeRef.current && hasTypedRef.current && !document.hidden && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
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
    
    if (content.length > 0 && hasTypedRef.current) {
      lastTypingTimeRef.current = now;
    }
  };

  const handleTabSwitchDetection = () => {
    if (!strictModeRef.current || !hasTypedRef.current || shouldStopTrackingRef.current || !isTextareaFocusedRef.current) return;
    
    const now = Date.now();
    const timeSinceLastSwitch = now - lastTabSwitchTimeRef.current;
    
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
      resetTimeTrackingForTextMode();
      return;
    }
    else if (timeSinceLastSwitch > 30000 && isCurrentlyTypingRef.current) {
      reportViolation({
        student_id: user?.id || 0,
        assignment_id: parseInt(assignmentId || '0'),
        violation_type: 'suspicious_activity',
        description: `Left page while typing for ${Math.round(timeSinceLastSwitch/1000)}s. Extended absence suggests possible cheating.`,
        time_away_seconds: Math.round(timeSinceLastSwitch / 1000),
        severity: 'high'
      });
      
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
    isTextareaFocusedRef.current = false;
    
    setShowViolationWarning(true);
    setViolationMessage('⚠️ TIME RESET TO 0! Text was added while you were away from the page. This is considered cheating.');
    
    Swal.fire({
      title: '⚠️ TIME RESET TO 0!',
      html: 'Text was added while you were away from the page.<br><br><strong>This is considered cheating.</strong><br><br>Your time tracking has been reset.',
      icon: 'warning',
      confirmButtonText: 'I Understand',
      confirmButtonColor: '#dc2626',
      showCloseButton: true,
      backdrop: true,
      allowOutsideClick: false
    });
    
    setTimeout(() => {
      setShowViolationWarning(false);
      if (contentRef.current?.value && contentRef.current.value.length > 0) {
        hasTypedRef.current = true;
        strictModeRef.current = true;
        console.log('📝 Re-enabling strict mode after time reset');
      }
    }, 5000);
  };

  const calculateTimeSpent = () => {
    if (!isActive || shouldStopTrackingRef.current) return;
    
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
      
      if (strictModeRef.current && hasTypedRef.current && isTextareaFocusedRef.current) {
        checkTextModeViolations();
      }
    }
  };

  const updateSecondsCounter = () => {
    if (!isActive || shouldStopTrackingRef.current) return;
    
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

  const stopTimeTracking = () => {
    console.log('🛑 STOPPING time tracking - Assignment already submitted');
    shouldStopTrackingRef.current = true;
    setIsActive(false);
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (secondTimerRef.current) {
      clearInterval(secondTimerRef.current);
      secondTimerRef.current = null;
    }
    if (violationCheckIntervalRef.current) {
      clearInterval(violationCheckIntervalRef.current);
      violationCheckIntervalRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (excessiveInactivityTimerRef.current) {
      clearTimeout(excessiveInactivityTimerRef.current);
      excessiveInactivityTimerRef.current = null;
    }
  };

  const handleVisibilityChange = () => {
    const now = Date.now();
    const timeSinceLastVisibilityChange = now - lastVisibilityChangeRef.current;
    
    if (document.hidden) {
      console.log('👋 Page hidden (switched to another app/tab)');
      setIsActive(false);
      
      if (hasTypedRef.current && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
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
      if (!shouldStopTrackingRef.current) {
        setIsActive(true);
        
        if (timeSinceLastVisibilityChange > 60000 && isTextareaFocusedRef.current) {
          reportViolation({
            student_id: user?.id || 0,
            assignment_id: parseInt(assignmentId || '0'),
            violation_type: 'suspicious_activity',
            description: `Excessive time away from page: ${Math.round(timeSinceLastVisibilityChange/1000)}s. Highly suspicious activity.`,
            time_away_seconds: Math.round(timeSinceLastVisibilityChange / 1000),
            severity: 'high'
          });
        }
        
        if (hasTypedRef.current && timeSinceLastVisibilityChange > 1000 && isTextareaFocusedRef.current) {
          handleTabSwitchDetection();
        }
        
        lastActiveTimeRef.current = Date.now();
        lastVisibilityChangeRef.current = now;
        
        startTimers();
      }
    }
  };

  const checkPageNavigation = () => {
    const currentPath = window.location.pathname;
    
    if (currentPath !== lastPagePathRef.current) {
      console.log(`🔄 Page navigation detected: ${lastPagePathRef.current} -> ${currentPath}`);
      
      if (lastPagePathRef.current.includes('/student/assignments/') && 
          !currentPath.includes('/student/assignments/')) {
        console.log('🚪 Leaving assignment page');
        
        if (hasTypedRef.current && contentRef.current?.value?.length > 50 && isTextareaFocusedRef.current) {
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

  const startTimers = () => {
    if (shouldStopTrackingRef.current) return;
    
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
    
    if (strictModeRef.current && hasTypedRef.current && isTextareaFocusedRef.current) {
      if (violationCheckIntervalRef.current) {
        clearInterval(violationCheckIntervalRef.current);
      }
      violationCheckIntervalRef.current = setInterval(checkTextModeViolations, 30000);
      
      excessiveInactivityTimerRef.current = setTimeout(() => {
        if (strictModeRef.current && hasTypedRef.current && !document.hidden && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
          reportViolation({
            student_id: user.id,
            assignment_id: parseInt(assignmentId),
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

  const startInactivityMonitoring = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      if (strictModeRef.current && hasTypedRef.current && !document.hidden && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
        console.log('⏰ Inactivity detected while in strict mode');
        lastTypingTimeRef.current = Date.now();
      }
    }, 30000);
  };

  const handlePageUnload = () => {
    console.log('📤 Page unloading...');
    pageUnloadRef.current = true;
    
    if (strictModeRef.current && hasTypedRef.current && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
      checkTextModeViolations();
    }
    
    saveTimeToLocalStorage();
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    console.log('⚠️ Page about to unload...');
    
    if (strictModeRef.current && hasTypedRef.current && !shouldStopTrackingRef.current && isTextareaFocusedRef.current) {
      checkTextModeViolations();
    }
    
    saveTimeToLocalStorage();
    
    if (contentRef.current?.value || fileRef.current?.files?.length || linkUrl) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };

  const trackTypingActivity = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldStopTrackingRef.current) return;
    
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
      
      Swal.fire({
        title: '⚠️ STRICT MODE ENABLED!',
        html: 'You have started typing.<br><br><strong>Switching tabs/apps will reset your time to 0 if text is added while away!</strong><br><br>Stay on this page while working.',
        icon: 'warning',
        confirmButtonText: 'I Understand',
        confirmButtonColor: '#f59e0b',
        showCloseButton: true,
        timer: 10000,
        timerProgressBar: true,
        backdrop: true
      });
      
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

  const trackContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (shouldStopTrackingRef.current) return;
    
    const newContent = e.target.value;
    const newLength = newContent.length;
    const oldLength = initialContentLengthRef.current;
    
    if (newLength > 0 && !hasTypedRef.current) {
      hasTypedRef.current = true;
      strictModeRef.current = true;
      typingStartTimeRef.current = Date.now();
      console.log('📝 Content detected - Enabling STRICT MODE');
    }
    
    if (strictModeRef.current && hasTypedRef.current && isTextareaFocusedRef.current) {
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

  const loadSchedules = async (): Promise<Schedule[]> => {
    try {
      console.log('📅 Loading student schedule...');
      const schedulesData = await authService.getStudentSchedule();
      console.log('✅ Student schedule loaded:', schedulesData);
      
      if (Array.isArray(schedulesData)) {
        const transformedSchedules: Schedule[] = schedulesData.map((schedule: any) => ({
          id: schedule.id || 0,
          class_id: schedule.class_id,
          class_name: schedule.class_name || `Class ${schedule.class_id}`,
          class_code: schedule.class_code || '',
          teacher_name: schedule.teacher_name || schedule.teacher_username || 'Teacher',
          teacher_full_name: schedule.teacher_full_name || schedule.teacher_name || 'Teacher',
          room_number: schedule.room_number || '',
          start_time: schedule.start_time || '',
          end_time: schedule.end_time || '',
          status: schedule.status || 'active'
        }));
        return transformedSchedules;
      }
      return [];
    } catch (error: any) {
      console.error('❌ Error loading student schedule:', error);
      return [];
    }
  };

  const loadStudentAssignment = async (): Promise<Assignment | null> => {
    try {
      console.log('📝 Loading student assignment...');
      
      if (!assignmentId) throw new Error('Assignment ID is required');
      const assignmentIdNum = parseInt(assignmentId);
      if (isNaN(assignmentIdNum)) throw new Error('Invalid assignment ID');
      
      let assignmentData: any = null;
      let classData: any = null;
      let teacherData: any = null;
      
      try {
        assignmentData = await authService.getStudentAssignmentDetail(assignmentIdNum);
        console.log('✅ Assignment data loaded:', assignmentData);
      } catch (firstError: any) {
        console.log('❌ First endpoint failed:', firstError.message);
        
        try {
          assignmentData = await authService.getStudentMyAssignment(assignmentIdNum);
          console.log('✅ Success with getStudentMyAssignment:', assignmentData);
        } catch (secondError: any) {
          console.log('❌ Second endpoint failed:', secondError.message);
          
          try {
            const allAssignments = await authService.getStudentAssignmentsAll();
            assignmentData = allAssignments.find((a: any) => a.id === assignmentIdNum);
            if (assignmentData) {
              console.log('✅ Found assignment in list:', assignmentData);
            } else {
              throw new Error('Assignment not found');
            }
          } catch (listError: any) {
            console.log('❌ List endpoint failed:', listError.message);
            throw new Error('Failed to load assignment');
          }
        }
      }
      
      if (!assignmentData) throw new Error('Failed to load assignment');
      
      let className = 'Class';
      let classCode = '';
      let teacherName = 'Unknown Teacher';
      let teacherFullName = 'Unknown Teacher';
      let creatorName = 'Unknown Teacher';
      let creatorUsername = '';
      
      if (assignmentData.class_name) {
        className = assignmentData.class_name;
      }
      if (assignmentData.class_code) {
        classCode = assignmentData.class_code;
      }
      
      if (assignmentData.teacher_name) {
        teacherName = assignmentData.teacher_name;
        teacherFullName = assignmentData.teacher_full_name || assignmentData.teacher_name;
        console.log('👨‍🏫 Found teacher_name in assignment data:', teacherName);
      } else if (assignmentData.teacher_full_name) {
        teacherName = assignmentData.teacher_full_name;
        teacherFullName = assignmentData.teacher_full_name;
        console.log('👨‍🏫 Found teacher_full_name in assignment data:', teacherName);
      } else if (assignmentData.creator_name) {
        teacherName = assignmentData.creator_name;
        teacherFullName = assignmentData.creator_name;
        creatorName = assignmentData.creator_name;
        console.log('👨‍🏫 Found creator_name in assignment data:', teacherName);
      } else if (assignmentData.creator_username) {
        teacherName = assignmentData.creator_username;
        teacherFullName = assignmentData.creator_username;
        creatorUsername = assignmentData.creator_username;
        console.log('👨‍🏫 Found creator_username in assignment data:', teacherName);
      }
      
      if (assignmentData.class && typeof assignmentData.class === 'object') {
        if (assignmentData.class.name) {
          className = assignmentData.class.name;
        }
        if (assignmentData.class.code) {
          classCode = assignmentData.class.code;
        }
        if (assignmentData.class.teacher_name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.class.teacher_name;
          teacherFullName = assignmentData.class.teacher_full_name || assignmentData.class.teacher_name;
          console.log('👨‍🏫 Found teacher_name in nested class:', teacherName);
        } else if (assignmentData.class.teacher_full_name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.class.teacher_full_name;
          teacherFullName = assignmentData.class.teacher_full_name;
          console.log('👨‍🏫 Found teacher_full_name in nested class:', teacherName);
        }
      }
      
      if (assignmentData.teacher && typeof assignmentData.teacher === 'object') {
        if (assignmentData.teacher.name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.teacher.name;
          teacherFullName = assignmentData.teacher.name;
          console.log('👨‍🏫 Found teacher.name in nested teacher:', teacherName);
        } else if (assignmentData.teacher.username && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.teacher.username;
          teacherFullName = assignmentData.teacher.username;
          console.log('👨‍🏫 Found teacher.username in nested teacher:', teacherName);
        } else if (assignmentData.teacher.full_name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.teacher.full_name;
          teacherFullName = assignmentData.teacher.full_name;
          console.log('👨‍🏫 Found teacher.full_name in nested teacher:', teacherName);
        }
      }
   
      if (assignmentData.creator && typeof assignmentData.creator === 'object') {
        if (assignmentData.creator.name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.creator.name;
          teacherFullName = assignmentData.creator.name;
          creatorName = assignmentData.creator.name;
          console.log('👨‍🏫 Found creator.name in nested creator:', teacherName);
        } else if (assignmentData.creator.username && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.creator.username;
          teacherFullName = assignmentData.creator.username;
          creatorUsername = assignmentData.creator.username;
          console.log('👨‍🏫 Found creator.username in nested creator:', teacherName);
        } else if (assignmentData.creator.full_name && teacherName === 'Unknown Teacher') {
          teacherName = assignmentData.creator.full_name;
          teacherFullName = assignmentData.creator.full_name;
          creatorName = assignmentData.creator.full_name;
          console.log('👨‍🏫 Found creator.full_name in nested creator:', teacherName);
        }
      }
      
      if ((!classCode || classCode === 'N/A' || teacherName === 'Unknown Teacher') && assignmentData.class_id) {
        try {
          console.log('📚 Fetching class data from /classes/student/ endpoint...');
          const studentClasses = await authService.getStudentClassesAll();
          const matchingClass = studentClasses.find((cls: any) => cls.id === assignmentData.class_id);
          
          if (matchingClass) {
            if (!className || className === `Class ${assignmentData.class_id}`) {
              className = matchingClass.name || className;
            }
            if (!classCode || classCode === 'N/A') {
              classCode = matchingClass.code || classCode;
            }
            if (teacherName === 'Unknown Teacher') {
              if (matchingClass.teacher_name) {
                teacherName = matchingClass.teacher_name;
                teacherFullName = matchingClass.teacher_full_name || matchingClass.teacher_name;
                console.log('👨‍🏫 Enhanced with class teacher_name:', teacherName);
              } else if (matchingClass.teacher_full_name) {
                teacherName = matchingClass.teacher_full_name;
                teacherFullName = matchingClass.teacher_full_name;
                console.log('👨‍🏫 Enhanced with class teacher_full_name:', teacherName);
              } else if (matchingClass.teacher_username) {
                teacherName = matchingClass.teacher_username;
                teacherFullName = matchingClass.teacher_username;
                console.log('👨‍🏫 Enhanced with class teacher_username:', teacherName);
              }
            }
            console.log('✅ Enhanced with class data:', { className, classCode, teacherName });
          }
        } catch (classError) {
          console.warn('⚠️ Could not fetch class data:', classError);
        }
      }
      
      if ((!classCode || classCode === '' || teacherName === 'Unknown Teacher') && assignmentData.class_id) {
        try {
          const schedulesData = await loadSchedules();
          if (schedulesData.length > 0) {
            const schedule = schedulesData.find(s => s.class_id === assignmentData.class_id);
            if (schedule) {
              if (!classCode || classCode === '') {
                classCode = schedule.class_code || classCode;
              }
              if (teacherName === 'Unknown Teacher') {
                teacherName = schedule.teacher_name || schedule.teacher_full_name || teacherName;
                teacherFullName = schedule.teacher_full_name || schedule.teacher_name || teacherFullName;
                console.log('👨‍🏫 Enhanced with schedule teacher data:', teacherName);
              }
              console.log('✅ Enhanced with schedule data:', { classCode, teacherName });
            }
          }
        } catch (scheduleError) {
          console.warn('⚠️ Could not fetch schedule data:', scheduleError);
        }
      }
      
      if (teacherName === 'Unknown Teacher' && assignmentData.creator_id) {
        try {
          console.log('👤 Fetching teacher/user data for creator_id:', assignmentData.creator_id);
          const teacherResponse = await authService.getUserById(assignmentData.creator_id);
          if (teacherResponse) {
            teacherName = teacherResponse.username || teacherResponse.name || teacherResponse.full_name || `User ${assignmentData.creator_id}`;
            teacherFullName = teacherResponse.full_name || teacherResponse.name || teacherResponse.username || `User ${assignmentData.creator_id}`;
            console.log('👨‍🏫 Found teacher from user endpoint:', teacherName);
          }
        } catch (userError) {
          console.warn('⚠️ Could not fetch teacher user data:', userError);
        }
      }
  
      const assignment: Assignment = {
        id: assignmentData.id,
        name: assignmentData.name,
        description: assignmentData.description,
        class_id: assignmentData.class_id,
        creator_id: assignmentData.creator_id,
        created_at: assignmentData.created_at,
        class_name: className,
        class_code: classCode,
        teacher_name: teacherName,
        teacher_full_name: teacherFullName,
        due_date: assignmentData.due_date
      };
      
      console.log('📝 Processed assignment data:', {
        id: assignment.id,
        name: assignment.name,
        class_id: assignment.class_id,
        creator_id: assignment.creator_id,
        teacher_name: assignment.teacher_name,
        teacher_full_name: assignment.teacher_full_name,
        rawData: assignmentData
      });
      
      console.log('🔍 Checking raw assignment data for teacher fields:');
      Object.keys(assignmentData).forEach(key => {
        if (key.toLowerCase().includes('teacher') || 
            key.toLowerCase().includes('creator') || 
            key.toLowerCase().includes('instructor') ||
            key.toLowerCase().includes('professor') ||
            key.toLowerCase().includes('user')) {
          console.log(`  ${key}:`, assignmentData[key]);
        }
      });
      
      return assignment;
      
    } catch (error: any) {
      console.error('❌ Error loading student assignment:', error);
      throw error;
    }
  };

  const loadStudentSubmission = async (): Promise<Submission | null> => {
    try {
      console.log('📤 Loading student submission...');
      
      if (!assignmentId) return null;
      const assignmentIdNum = parseInt(assignmentId);
      if (isNaN(assignmentIdNum)) return null;
      
      let submissionData: any = null;
      
      try {
        submissionData = await authService.getStudentMySubmission(assignmentIdNum);
        console.log('✅ Success with getStudentMySubmission:', submissionData);
      } catch (firstError: any) {
        console.log('❌ First endpoint failed:', firstError.message);
        
        try {
          submissionData = await authService.getStudentSubmissionForAssignment(assignmentIdNum);
          console.log('✅ Success with getStudentSubmissionForAssignment:', submissionData);
        } catch (secondError: any) {
          console.log('❌ Second endpoint failed:', secondError.message);
          
          if (secondError.response?.status === 404 || firstError.response?.status === 404) {
            console.log('ℹ️ No submission found (404)');
            return null;
          }
        }
      }
      
      if (!submissionData) {
        console.log('ℹ️ No submission found');
        return null;
      }
      
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
      
    } catch (error: any) {
      console.error('❌ Error loading submission:', error);
      return null;
    }
  };

  const loadViolations = async () => {
    if (!assignmentId || !user) return;
    
    try {
      console.log('🚨 Loading violations...');
      const violationsData = await authService.getViolations(parseInt(assignmentId));
      
      if (Array.isArray(violationsData)) {
        const convertedViolations: Violation[] = violationsData.map(violation => 
          convertToViolation(violation)
        );
        
        setViolations(convertedViolations);
        console.log('✅ Violations loaded:', convertedViolations.length);
      }
    } catch (error) {
      console.warn('⚠️ Could not load violations from API:', error);
      try {
        const savedViolations = localStorage.getItem(`assignment_${assignmentId}_violations`);
        if (savedViolations) {
          const parsedViolations = JSON.parse(savedViolations);
          setViolations(parsedViolations);
        }
      } catch (localError) {
        console.error('Error loading violations from localStorage:', localError);
      }
    }
  };

  const enrichAssignmentWithScheduleData = (assignmentData: Assignment, schedulesData: Schedule[]): Assignment => {
    const enrichedAssignment = { ...assignmentData };
    
    console.log('📊 Enriching assignment with schedule data...');
    console.log('📊 Schedules available:', schedulesData.length);
    console.log('📊 Looking for class_id:', assignmentData.class_id);
    console.log('📊 Current teacher name:', assignmentData.teacher_name);
    
    const schedule = schedulesData.find(s => s.class_id === assignmentData.class_id);
    
    if (schedule) {
      console.log('✅ Found matching schedule:', schedule);
      
      if (schedule.teacher_name && schedule.teacher_name !== 'Teacher') {
        enrichedAssignment.teacher_name = schedule.teacher_name;
        enrichedAssignment.teacher_full_name = schedule.teacher_full_name || schedule.teacher_name;
        console.log('👨‍🏫 Override teacher name from schedule:', schedule.teacher_name);
      } else if (schedule.teacher_full_name && schedule.teacher_full_name !== 'Teacher') {
        enrichedAssignment.teacher_name = schedule.teacher_full_name;
        enrichedAssignment.teacher_full_name = schedule.teacher_full_name;
        console.log('👨‍🏫 Override teacher name from schedule (full):', schedule.teacher_full_name);
      }
      
      if (schedule.class_name && schedule.class_name !== `Class ${assignmentData.class_id}`) {
        enrichedAssignment.class_name = schedule.class_name;
        console.log('🏫 Updated class name from schedule:', schedule.class_name);
      }
      
      if (schedule.class_code) {
        enrichedAssignment.class_code = schedule.class_code;
        console.log('📚 Updated class code from schedule:', schedule.class_code);
      }
    } else {
      console.log('❌ No matching schedule found for class_id:', assignmentData.class_id);
    }
    
    return enrichedAssignment;
  };

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
      console.log('📅 Schedules loaded:', schedulesData.length);

      const assignmentData = await loadStudentAssignment();
      if (!assignmentData) {
        throw new Error('Assignment not found or no permission.');
      }

      console.log('📝 Assignment loaded:', assignmentData);

      const enrichedAssignment = enrichAssignmentWithScheduleData(assignmentData, schedulesData);
      setAssignment(enrichedAssignment);

      const isTextAssignment = checkIfTextAssignment(enrichedAssignment.description);
      if (isTextAssignment) {
        console.log('📝 This appears to be a text-based assignment');
      }

      const submissionData = await loadStudentSubmission();
      if (submissionData) {
        setSubmission(submissionData);
        
        shouldStopTrackingRef.current = true;
        stopTimeTracking();
        
        if (contentRef.current) {
          contentRef.current.value = submissionData.content || '';
          contentSnapshotRef.current = submissionData.content || '';
          if (submissionData.content && submissionData.content.length > 0) {
            hasTypedRef.current = true;
            strictModeRef.current = true;
            console.log('📝 Existing submission found - STRICT MODE was enabled');
          }
        }
        if (submissionData.link_url) {
          setLinkUrl(submissionData.link_url);
        }
      } else {
        shouldStopTrackingRef.current = false;
      }

      const savedTime = loadTimeFromLocalStorage();
      activeTimeRef.current = savedTime;
      
      const totalMinutes = Math.floor(savedTime);
      const remainingSeconds = Math.floor((savedTime - totalMinutes) * 60);
      
      setTimeSpent(totalMinutes);
      setSeconds(remainingSeconds);
      
      if (timeSpentRef.current) {
        timeSpentRef.current.value = savedTime.toFixed(2);
      }

      await loadViolations();

      try {
        const savedContentLength = localStorage.getItem(`content_before_leaving_${assignmentId}`);
        if (savedContentLength) {
          contentBeforeLeavingRef.current = parseInt(savedContentLength);
        }
      } catch (e) {
        console.error('Error loading content length:', e);
      }

      setSuccess('Assignment loaded successfully!');
      
    } catch (error: any) {
      console.error('❌ Error loading assignment data:', error);
      
      let errorMessage = 'Failed to load assignment. Please try again.';
      
      if (error.message) errorMessage = error.message;
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.response?.status === 403) errorMessage = 'No permission to view this assignment.';
      else if (error.response?.status === 404) errorMessage = 'Assignment not found.';
      
      setError(errorMessage);
      
      try {
        const savedAssignments = localStorage.getItem('student_assignments');
        if (savedAssignments && assignmentId) {
          const assignments = JSON.parse(savedAssignments);
          const fallbackAssignment = assignments.find((a: any) => a.id === parseInt(assignmentId));
          if (fallbackAssignment) {
            console.log('🔄 Using fallback assignment data');
            
            const schedulesData = await loadSchedules();
            if (schedulesData.length > 0 && fallbackAssignment.class_id) {
              const enrichedAssignment = enrichAssignmentWithScheduleData(fallbackAssignment, schedulesData);
              setAssignment(enrichedAssignment);
            } else {
              setAssignment(fallbackAssignment);
            }
            setError(null);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
      initialLoadRef.current = false;
      
      if (!shouldStopTrackingRef.current) {
        startTimers();
      }
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/login');
      return;
    }
    
    lastPagePathRef.current = window.location.pathname;
    lastVisibilityChangeRef.current = Date.now();
    initialLoadRef.current = true;
    
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        if (fileRef.current) fileRef.current.value = '';
        
        Swal.fire({
          title: 'File Size Exceeded',
          text: 'File size exceeds 10MB limit. Please upload a smaller file.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
        
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
        
        Swal.fire({
          title: 'Invalid File Type',
          html: 'Invalid file type.<br><br>Please upload:<br>• PDF<br>• DOC/DOCX<br>• TXT<br>• JPG/PNG/GIF',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
        
        return;
      }
      
      setSelectedFileName(file.name);
      setError(null);
      
      Swal.fire({
        title: 'File Selected',
        text: `"${file.name}" has been selected for upload.`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: 3000,
        timerProgressBar: true
      });
    } else {
      setSelectedFileName('');
    }
  };

  const handleRemoveFile = () => {
    if (fileRef.current) {
      fileRef.current.value = '';
      setSelectedFileName('');
      
      Swal.fire({
        title: 'File Removed',
        text: 'Selected file has been removed.',
        icon: 'info',
        confirmButtonText: 'OK',
        confirmButtonColor: '#6b7280'
      });
    }
  };

  const handleRemoveLink = () => {
    setLinkUrl('');
    
    Swal.fire({
      title: 'Link Removed',
      text: 'Submitted link has been removed.',
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#6b7280'
    });
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

      if (!content && !file && !link) {
        setError('Please provide either text content, upload a file, or submit a link');
      
        Swal.fire({
          title: 'Submission Required',
          text: 'Please provide either text content, upload a file, or submit a link.',
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#f59e0b'
        });
        
        return;
      }

      if (link && !isValidUrl(link)) {
        setError('Please enter a valid URL (must start with http:// or https://)');
        
        Swal.fire({
          title: 'Invalid URL',
          text: 'Please enter a valid URL (must start with http:// or https://).',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
        
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

      Swal.fire({
        title: submission ? 'Updating Submission...' : 'Submitting Assignment...',
        text: 'Please wait while we process your submission.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      let newSubmission;
      
      if (file) {
        if (submission?.id) {
          newSubmission = await authService.updateSubmissionWithFile(
            submission.id,
            assignmentIdNum,
            timeSpentValue,
            content,
            link,
            file
          );
          setSuccess('Assignment updated successfully!');
        } else {
          newSubmission = await authService.createSubmissionWithFile(
            assignmentIdNum,
            timeSpentValue,
            content,
            link,
            file
          );
          setSuccess('Assignment submitted successfully!');
        }
      } else {
        const submissionData = {
          assignment_id: assignmentIdNum,
          time_spent_minutes: timeSpentValue,
          content: content || undefined,
          link_url: link || undefined
        };
        
        try {
          if (submission?.id) {
            newSubmission = await authService.updateSubmissionWithFile(
              submission.id,
              assignmentIdNum,
              timeSpentValue,
              content,
              link
            );
            setSuccess('Assignment updated successfully!');
          } else {
            newSubmission = await authService.createSubmissionWithFile(
              assignmentIdNum,
              timeSpentValue,
              content,
              link
            );
            setSuccess('Assignment submitted successfully!');
          }
        } catch (apiError: any) {
          console.error('API submission error:', apiError);
          throw apiError;
        }
      }

      const updatedSubmission = {
        id: newSubmission.id,
        assignment_id: newSubmission.assignment_id,
        student_id: newSubmission.student_id,
        content: newSubmission.content || '',
        file_path: newSubmission.file_path,
        submitted_at: newSubmission.submitted_at,
        grade: newSubmission.grade,
        feedback: newSubmission.feedback,
        is_graded: newSubmission.grade !== null && newSubmission.grade !== undefined,
        file_name: newSubmission.file_name,
        time_spent_minutes: newSubmission.time_spent_minutes,
        link_url: newSubmission.link_url || ''
      };
      
      setSubmission(updatedSubmission);

      stopTimeTracking();
      
      if (assignmentId) {
        localStorage.removeItem(`assignment_${assignmentId}_time`);
        localStorage.removeItem(`assignment_${assignmentId}_violations`);
        localStorage.removeItem(`content_length_${assignmentId}`);
        localStorage.removeItem(`content_before_leaving_${assignmentId}`);
      }

      try {
        const savedSubmissions = localStorage.getItem('student_submissions') || '[]';
        const submissions = JSON.parse(savedSubmissions);
        const filteredSubmissions = submissions.filter((s: any) => s.assignment_id !== assignmentIdNum);
        
        const cachedSubmission = {
          assignment_id: assignmentIdNum,
          content: content,
          link_url: link,
          time_spent_minutes: timeSpentValue,
          submitted_at: new Date().toISOString()
        };
        
        localStorage.setItem('student_submissions', JSON.stringify([
          ...filteredSubmissions,
          cachedSubmission
        ]));
      } catch (cacheError) {
        console.warn('Failed to update localStorage cache:', cacheError);
      }

      if (contentRef.current) contentRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
      setSelectedFileName('');
      setLinkUrl('');
      
      resetTimeTracking();
      hasTypedRef.current = false;
      strictModeRef.current = false;
      isCurrentlyTypingRef.current = false;
      isTextareaFocusedRef.current = false;
      contentBeforeLeavingRef.current = 0;
      contentSnapshotRef.current = '';
      aiContentDetectionRef.current = false;
      largePasteCountRef.current = 0;
      tabSwitchHistoryRef.current = [];

      Swal.close();

      Swal.fire({
        title: '✅ Success!',
        text: submission ? 'Assignment updated successfully!' : 'Assignment submitted successfully!',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: 3000, 
        timerProgressBar: true, 
        showConfirmButton: false 
      });


    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      
      let errorMessage = 'Failed to submit assignment. Please try again.';
      
      if (error.response?.status === 403) errorMessage = 'No permission to submit.';
      else if (error.response?.status === 400) errorMessage = error.response.data?.detail || 'Invalid data.';
      else if (error.response?.status === 409) errorMessage = 'Already submitted.';
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.message) errorMessage = error.message;
      
      setError(errorMessage);
      
      Swal.close();
      
      Swal.fire({
        title: '❌ Submission Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubmit = async () => {
    if (!submission?.id) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, unsubmit it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      
      Swal.fire({
        title: 'Unsubmitting...',
        text: 'Please wait while we process your request.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      if (!user) {
        throw new Error('No user found. Please log in again.');
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:8000/submissions/${submission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to delete submission: ${response.status}`);
      }

      setSubmission(null);
      setSelectedFileName('');
      setLinkUrl('');
      
      resetTimeTracking();
      shouldStopTrackingRef.current = false;
      setIsActive(true);
      startTimers();
      
      hasTypedRef.current = false;
      strictModeRef.current = false;
      isCurrentlyTypingRef.current = false;
      isTextareaFocusedRef.current = false;
      contentBeforeLeavingRef.current = 0;
      contentSnapshotRef.current = '';
      aiContentDetectionRef.current = false;
      largePasteCountRef.current = 0;
      tabSwitchHistoryRef.current = [];
      
      setSuccess('Assignment unsubmitted successfully! You can now edit and resubmit.');
      
      if (contentRef.current) contentRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';

      Swal.close();

      Swal.fire({
        title: '✅ Unsubmitted Successfully!',
        text: 'Your assignment has been unsubmitted. You can now edit and resubmit.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: 3000, 
        timerProgressBar: true,
        showConfirmButton: false
      });

    } catch (error: any) {
      console.error('Error unsubmitting assignment:', error);
      
      let errorMessage = 'Failed to unsubmit assignment. Please try again.';
      
      if (error.message.includes('Failed to delete submission: 400')) {
        errorMessage = 'Cannot unsubmit. Submission may be graded or there are validation issues.';
      } else if (error.message.includes('Failed to delete submission: 404')) {
        errorMessage = 'Submission not found. It may have already been deleted.';
      } else if (error.message.includes('Failed to delete submission: 403')) {
        errorMessage = 'You do not have permission to unsubmit this assignment.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      Swal.close();
  
      Swal.fire({
        title: '❌ Unsubmit Failed',
        html: `${errorMessage}<br><br><strong>Try refreshing the page and trying again.</strong>`,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
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
     
      Swal.fire({
        title: 'Preparing Download...',
        text: 'Please wait while we prepare your file.',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const blob = await authService.downloadSubmissionFile(submission.id);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.file_name || 'submission_file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        title: '✅ Download Started',
        text: 'Your file download has started.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: 3000, 
        timerProgressBar: true,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      
      try {
        const fileUrl = `http://localhost:8000${submission.file_path}`;
        window.open(fileUrl, '_blank');
      } catch (fallbackError) {
        setError('Failed to download file. Please try again.');
        
        Swal.fire({
          title: '❌ Download Failed',
          text: 'Failed to download file. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-blue-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-red-500 border-t-transparent mx-auto mb-6"></div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Loading Assignment...</h2>
            <p className="text-gray-600 max-w-md mx-auto">Please wait while we load your assignment details and submission data.</p>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-gradient-to-r from-red-500 to-blue-500 animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500">Fetching data from server...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-100">
          <div className="text-center">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-red-100 rounded-full blur-md"></div>
              <div className="relative w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Assignment Loading Failed</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/student/assignments')}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                title="Go back to assignments"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Assignments
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
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
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 013-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
              title="Toggle menu"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        <div className="hidden lg:block">
          <DynamicHeader 
            title={assignment?.name || "Assignment"}
            subtitle="Submit your work and track your progress"
            showBackButton={true}
            backTo="/student/assignments"
          />
        </div>

        <main className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="max-w-6xl mx-auto p-4 md:p-6">
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
                    aria-label="Dismiss warning"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

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
                    aria-label="Dismiss error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-700">Success</h3>
                    <p className="text-sm text-gray-600 mt-1">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{assignment?.name}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">
                                {assignment?.class_name}
                                {assignment?.class_code && ` (${assignment.class_code})`}
                              </span>
                              {strictModeRef.current && hasTypedRef.current && !shouldStopTrackingRef.current && (
                                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-300">
                                  ⚠️ STRICT MODE
                                </span>
                              )}
                              {shouldStopTrackingRef.current && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-300">
                                  ✅ SUBMITTED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Teacher</span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                              {assignment?.teacher_name || assignment?.teacher_full_name || 'Unknown Teacher'}
                            </p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Created</span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                              {assignment?.created_at ? formatDate(assignment.created_at) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {submission && submission.grade !== null && submission.grade !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className={`px-6 py-3 rounded-xl border-2 font-bold text-lg ${getGradeColor(submission.grade)}`}>
                            Grade: {submission.grade}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z" />
                      </svg>
                      Assignment Description
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {assignment?.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Your Submission</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="assignment-content" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {shouldStopTrackingRef.current 
                          ? 'Your Work (SUBMITTED)' 
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'Your Work (STRICT MODE)' 
                          : 'Your Work'
                        }
                      </label>
                      <textarea
                        id="assignment-content"
                        ref={contentRef}
                        rows={8}
                        className="w-full px-4 py-4 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 shadow-sm"
                        placeholder={shouldStopTrackingRef.current 
                          ? "✅ Assignment submitted. You can edit and resubmit if needed." 
                          : strictModeRef.current && hasTypedRef.current 
                          ? "⚠️ WARNING: Do not switch tabs/apps while typing! Time will reset to 0 if text is added while away." 
                          : "Type your assignment submission here... (You can also upload a file or submit a link below)"
                        }
                        defaultValue={submission?.content || ''}
                        onKeyDown={trackTypingActivity}
                        onChange={trackContentChange}
                        onFocus={() => {
                          if (strictModeRef.current && hasTypedRef.current && !shouldStopTrackingRef.current) {
                            isCurrentlyTypingRef.current = true;
                          }
                          isTextareaFocusedRef.current = true;
                          lastFocusTimeRef.current = Date.now();
                        }}
                        onBlur={() => {
                          if (strictModeRef.current && hasTypedRef.current && !shouldStopTrackingRef.current) {
                            isCurrentlyTypingRef.current = false;
                          }
                          isTextareaFocusedRef.current = false;
                        }}
                        disabled={shouldStopTrackingRef.current}
                      />
                      {shouldStopTrackingRef.current ? (
                        <div className="mt-3 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                          ✅ <strong>Assignment Submitted:</strong> Time tracking has been stopped. No violations will be recorded. Click "Unsubmit" to edit and restart tracking.
                        </div>
                      ) : strictModeRef.current && hasTypedRef.current ? (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                          ⚠️ <strong>Strict Mode Active:</strong> Do not switch tabs/apps while typing. If text is added while you are away, time will reset to <strong>0</strong> and HIGH severity violation will be recorded.
                        </div>
                      ) : !hasTypedRef.current ? (
                        <div className="mt-3 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          💡 <strong>Tip:</strong> You can still browse other tabs/apps. Strict mode will only activate once you start typing.
                        </div>
                      ) : null}
                    </div>
                    
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
                            className="flex-1 px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-xl text-gray-900 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            disabled={shouldStopTrackingRef.current}
                          />
                          {linkUrl && (
                            <button
                              onClick={handleRemoveLink}
                              className="p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition-all duration-200 cursor-pointer"
                              title="Remove link"
                              disabled={shouldStopTrackingRef.current}
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-700 text-sm font-medium truncate">{linkUrl}</span>
                            </div>
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 text-sm"
                              title="Open link in new tab"
                              aria-label="Open link in new tab"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="assignment-file" className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload File (Optional)
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className={`flex-1 cursor-pointer ${shouldStopTrackingRef.current ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                              type="file"
                              id="assignment-file"
                              ref={fileRef}
                              onChange={handleFileChange}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                              disabled={shouldStopTrackingRef.current}
                            />
                            <div className={`w-full px-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 flex items-center justify-center gap-2 ${
                              shouldStopTrackingRef.current
                                ? 'bg-gray-100 border-2 border-gray-300'
                                : 'bg-yellow-50 border-2 border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400'
                            }`}>
                              <svg className={`w-5 h-5 ${
                                shouldStopTrackingRef.current ? 'text-gray-500' : 'text-yellow-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className={`font-medium ${
                                shouldStopTrackingRef.current ? 'text-gray-600' : 'text-yellow-700'
                              }`}>
                                {shouldStopTrackingRef.current ? 'File Upload Disabled' : 'Browse Files'}
                              </span>
                            </div>
                          </label>
                        </div>
                        
                        {selectedFileName && (
                          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-700 text-sm font-medium truncate">{selectedFileName}</span>
                            </div>
                            <button
                              onClick={handleRemoveFile}
                              className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                              title="Remove selected file"
                              disabled={shouldStopTrackingRef.current}
                              aria-label="Remove selected file"
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

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => navigate('/student/assignments')}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                        title="Go back to assignments list"
                        aria-label="Go back to assignments list"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Assignments
                      </button>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        {submission && (
                          <button
                            onClick={handleUnsubmit}
                            className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm cursor-pointer"
                            disabled={isSubmitting}
                            title="Unsubmit this assignment"
                            aria-label="Unsubmit this assignment"
                          >
                            Unsubmit
                          </button>
                        )}
                        
                        <button
                          onClick={handleSubmitAssignment}
                          disabled={isSubmitting || shouldStopTrackingRef.current}
                          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                            shouldStopTrackingRef.current
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                          }`}
                          title={shouldStopTrackingRef.current 
                            ? "Already submitted" 
                            : submission 
                            ? "Update your submission" 
                            : "Submit your assignment"
                          }
                          aria-label={shouldStopTrackingRef.current 
                            ? "Already submitted" 
                            : submission 
                            ? "Update your submission" 
                            : "Submit your assignment"
                          }
                        >
                          {isSubmitting && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {shouldStopTrackingRef.current 
                              ? 'Already Submitted' 
                              : isSubmitting 
                                ? (submission ? 'Updating...' : 'Submitting...') 
                                : (submission ? 'Update Submission' : 'Submit Assignment')
                            }
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 a9 9 0 0118 0z" />
                    </svg>
                    Time Tracking
                  </h3>
                  
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <div className={`text-5xl font-bold ${
                        shouldStopTrackingRef.current
                          ? 'text-gray-700'
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>
                        {timeSpent}
                      </div>
                      <div className={`text-3xl font-semibold ${
                        shouldStopTrackingRef.current
                          ? 'text-gray-700'
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>
                        m
                      </div>
                      <div className={`text-5xl font-bold ${
                        shouldStopTrackingRef.current
                          ? 'text-gray-700'
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>
                        {seconds.toString().padStart(2, '0')}
                      </div>
                      <div className={`text-3xl font-semibold ${
                        shouldStopTrackingRef.current
                          ? 'text-gray-700'
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>
                        s
                      </div>
                    </div>
                    
                    <div className={`text-lg font-medium mb-1 ${
                      shouldStopTrackingRef.current
                        ? 'text-gray-600'
                        : strictModeRef.current && hasTypedRef.current 
                        ? 'text-red-600' 
                        : 'text-blue-600'
                    }`}>
                      {shouldStopTrackingRef.current 
                        ? 'Submission Complete' 
                        : strictModeRef.current && hasTypedRef.current 
                        ? 'Strict Anti-Cheat Mode' 
                        : 'Normal Time Tracker'
                      }
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <div className={`w-3 h-3 rounded-full ${
                        shouldStopTrackingRef.current
                          ? 'bg-gray-500'
                          : isActive 
                          ? 'bg-green-500' 
                          : 'bg-red-500'
                      } ${shouldStopTrackingRef.current ? '' : 'animate-pulse'}`}></div>
                      <div className={`text-sm font-medium ${
                        shouldStopTrackingRef.current
                          ? 'text-gray-600'
                          : strictModeRef.current && hasTypedRef.current 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                      }`}>
                        {shouldStopTrackingRef.current 
                          ? 'Tracking stopped' 
                          : isActive 
                            ? `Working... ${timeSpent}m ${seconds}s` 
                            : 'Paused - switched tab/window'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <input
                    id="time-spent"
                    ref={timeSpentRef}
                    type="hidden"
                    value={activeTimeRef.current.toFixed(2)}
                  />
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Tracking Status</h4>
                      <div className="space-y-2">
                        {shouldStopTrackingRef.current ? (
                          <>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600"><strong>Assignment submitted</strong></span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">Time tracking <strong>STOPPED</strong></span>
                            </div>
                          </>
                        ) : strictModeRef.current && hasTypedRef.current ? (
                          <>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600"><strong>Strict mode active</strong> - Typing detected</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">Text added while away = <strong>TIME RESETS TO 0</strong></span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">Normal tracking mode</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">Strict mode activates when typing</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {violations.length > 0 && (
                      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-yellow-800">Violation Alerts</h4>
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {violations.length}
                          </span>
                        </div>
                        <div className="text-xs text-yellow-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>High Severity:</span>
                            <span className="font-bold text-red-600">{violations.filter(v => v.severity === 'high').length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Medium Severity:</span>
                            <span className="font-bold text-yellow-600">{violations.filter(v => v.severity === 'medium').length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Low Severity:</span>
                            <span className="font-bold text-blue-600">{violations.filter(v => v.severity === 'low').length}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {submission && (
                  <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 a9 9 0 0118 0z" />
                      </svg>
                      Submission Status
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700">Submitted</span>
                          <span className="text-sm text-green-600">
                            {submission.submitted_at ? formatDate(submission.submitted_at) : 'N/A'}
                          </span>
                        </div>
                        {submission.time_spent_minutes && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-700">Final Time</span>
                            <span className="text-sm text-green-600">
                              {Math.floor(submission.time_spent_minutes)}m {Math.round((submission.time_spent_minutes - Math.floor(submission.time_spent_minutes)) * 60)}s
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {submission.file_path && (
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-blue-700 truncate">{submission.file_name || 'Uploaded file'}</span>
                          </div>
                          <button
                            onClick={downloadFile}
                            className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1 text-sm"
                            title="Download submitted file"
                            aria-label="Download submitted file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        </div>
                      )}
                      
                      {submission.feedback && (
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                          <h4 className="text-sm font-semibold text-purple-800 mb-2">Teacher Feedback</h4>
                          <p className="text-sm text-purple-700 whitespace-pre-wrap">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 a9 9 0 0118 0z" />
                    </svg>
                    Submission Instructions
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">Submit using <strong>any one</strong> method: Text, Link, or File</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">Submit multiple methods for additional context</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">Error only if <strong>all three fields are empty</strong></span>
                    </div>
                    {shouldStopTrackingRef.current && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-sm text-gray-600"><strong>Note:</strong> Time tracking stops after submission</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {violations.length > 0 && (
              <div className="mt-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                  <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Violation History ({violations.length} records)
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {violations.map((violation, index) => (
                      <div key={index} className={`p-4 rounded-xl border ${
                        violation.severity === 'high' 
                          ? 'bg-red-50 border-red-200' 
                          : violation.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                violation.severity === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : violation.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {violation.severity === 'high' ? '🔴 HIGH' : violation.severity === 'medium' ? '🟡 MEDIUM' : '🔵 LOW'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(violation.detected_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{violation.description}</p>
                            {violation.time_away_seconds > 0 && (
                              <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                                <span>⏱️ Time away: {violation.time_away_seconds}s</span>
                                {violation.content_added_during_absence && 
                                  <span>📝 Text added: {violation.content_added_during_absence} chars</span>
                                }
                                {violation.paste_content_length && 
                                  <span>📋 Paste size: {violation.paste_content_length} chars</span>
                                }
                                {violation.ai_similarity_score && 
                                  <span>🤖 AI similarity: {(violation.ai_similarity_score * 100).toFixed(1)}%</span>
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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