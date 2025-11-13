/**
 * DebatesCalendar Component
 *
 * Displays a calendar view with square indicators showing debate activity:
 * - Blue squares: House Debates (without Question Period)
 * - Red squares: Question Period
 * - Green squares: Committee Testimony
 * - Purple outlined squares: Scheduled Meetings
 *
 * Features:
 * - Toggle between 1 month and 3 month view (persisted in localStorage)
 * - Drag to select date ranges
 * - Keyboard navigation (arrows + Enter, Shift for range selection)
 * - Rich hover popovers showing event details
 * - ESC to clear selection
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_DEBATES_CALENDAR_DATA } from '@/lib/queries';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface ScheduledMeetingInfo {
  committee_code: string;
  committee_name: string;
  number: number;
  in_camera: boolean;
}

interface DebatesByDate {
  date: string;
  hasHouseDebates: boolean;
  hasQuestionPeriod: boolean;
  hasCommittee: boolean;
  hasScheduledMeeting: boolean;
  scheduledMeetings: ScheduledMeetingInfo[];
}

interface DebatesCalendarProps {
  onDateRangeSelect: (start: Date | null, end: Date | null) => void;
  selectedStartDate: Date | null;
  selectedEndDate: Date | null;
  onViewModeChange?: (monthsToShow: 1 | 3) => void;
}

const STORAGE_KEY = 'canadagpt_calendar_view_mode';

export function DebatesCalendar({ onDateRangeSelect, selectedStartDate, selectedEndDate, onViewModeChange }: DebatesCalendarProps) {
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;
  const calendarRef = useRef<HTMLDivElement>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  // View mode: 1 or 3 months, persisted in localStorage
  const [monthsToShow, setMonthsToShow] = useState<1 | 3>(3);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragPreview, setDragPreview] = useState<Date | null>(null);

  // Hover popover state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);

  // Load view preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '1' || stored === '3') {
      const value = parseInt(stored) as 1 | 3;
      setMonthsToShow(value);
      onViewModeChange?.(value);
    }
  }, [onViewModeChange]);

  // Save view preference to localStorage
  const toggleMonthsView = () => {
    const newValue = monthsToShow === 1 ? 3 : 1;
    setMonthsToShow(newValue);
    localStorage.setItem(STORAGE_KEY, newValue.toString());
    onViewModeChange?.(newValue);
  };

  // Calculate calendar range based on view mode
  const previousMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);

  const calendarStart = monthsToShow === 3
    ? format(startOfMonth(previousMonth), 'yyyy-MM-dd')
    : format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const calendarEnd = monthsToShow === 3
    ? format(endOfMonth(nextMonth), 'yyyy-MM-dd')
    : format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  // Fetch calendar data
  const { data, loading } = useQuery(GET_DEBATES_CALENDAR_DATA, {
    variables: {
      startDate: calendarStart,
      endDate: calendarEnd,
    },
  });

  const debatesData: DebatesByDate[] = data?.debatesCalendarData || [];

  // Create a map for quick lookup
  const debatesMap = new Map<string, DebatesByDate>();
  debatesData.forEach((item) => {
    debatesMap.set(item.date, item);
  });

  const clearSelection = useCallback(() => {
    onDateRangeSelect(null, null);
    setDragStart(null);
    setDragPreview(null);
    setIsDragging(false);
  }, [onDateRangeSelect]);

  // ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectedStartDate || isDragging)) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStartDate, isDragging, clearSelection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedDate) return;

      let newDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newDate = subDays(focusedDate, 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newDate = addDays(focusedDate, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newDate = subDays(focusedDate, 7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newDate = addDays(focusedDate, 7);
          break;
        case 'Enter':
          e.preventDefault();
          const dateStr = format(focusedDate, 'yyyy-MM-dd');
          const debate = debatesMap.get(dateStr);
          if (debate && (debate.hasHouseDebates || debate.hasQuestionPeriod || debate.hasCommittee || debate.hasScheduledMeeting)) {
            if (e.shiftKey && selectedStartDate) {
              // Shift+Enter for range selection
              const start = focusedDate < selectedStartDate ? focusedDate : selectedStartDate;
              const end = focusedDate < selectedStartDate ? selectedStartDate : focusedDate;
              onDateRangeSelect(start, end);
            } else {
              // Enter for single date selection
              onDateRangeSelect(focusedDate, focusedDate);
            }
          }
          break;
      }

      if (newDate) {
        setFocusedDate(newDate);
        // Update currentMonth if we navigate outside visible range
        if (!isSameMonth(newDate, currentMonth)) {
          setCurrentMonth(newDate);
        }
      }
    };

    if (focusedDate) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [focusedDate, currentMonth, selectedStartDate, debatesMap, onDateRangeSelect]);

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setFocusedDate(new Date());
  };

  // Mouse handlers for drag selection
  const handleMouseDown = (date: Date, hasDebates: boolean) => {
    if (!hasDebates) return;

    setIsDragging(true);
    setDragStart(date);
    setFocusedDate(date);
    onDateRangeSelect(date, date);
  };

  const handleMouseEnter = (date: Date, event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDragging && dragStart) {
      setDragPreview(date);
      const start = dragStart < date ? dragStart : date;
      const end = dragStart < date ? date : dragStart;
      onDateRangeSelect(start, end);
    }

    // Update popover position
    const rect = event.currentTarget.getBoundingClientRect();
    setPopoverPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragPreview(null);
  };

  // Add global mouse up listener
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const isInDragRange = (day: Date): boolean => {
    if (!isDragging || !dragStart || !dragPreview) return false;
    const start = dragStart < dragPreview ? dragStart : dragPreview;
    const end = dragStart < dragPreview ? dragPreview : dragStart;
    return day >= start && day <= end;
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div key={monthDate.toISOString()} className="flex-1 min-w-[240px]">
        <h3 className="text-base font-semibold text-text-primary mb-2 text-center">
          {format(monthDate, 'MMMM yyyy', { locale: dateLocale })}
        </h3>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-center text-xs font-medium text-text-tertiary p-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const debate = debatesMap.get(dateStr);
            const hasDebates = debate && (debate.hasHouseDebates || debate.hasQuestionPeriod || debate.hasCommittee || debate.hasScheduledMeeting);
            const isCurrentMonth = isSameMonth(day, monthDate);
            const isToday = isSameDay(day, new Date());
            const isSelected =
              (selectedStartDate && isSameDay(day, selectedStartDate)) ||
              (selectedEndDate && isSameDay(day, selectedEndDate));
            const isInRange =
              selectedStartDate &&
              selectedEndDate &&
              day >= selectedStartDate &&
              day <= selectedEndDate;
            const isFocused = focusedDate && isSameDay(day, focusedDate);
            const isHovered = hoveredDate === dateStr;

            return (
              <div key={day.toISOString()} className="relative">
                <button
                  onMouseDown={() => handleMouseDown(day, Boolean(hasDebates && isCurrentMonth))}
                  onMouseEnter={(e) => {
                    if (hasDebates && isCurrentMonth) {
                      setHoveredDate(dateStr);
                      handleMouseEnter(day, e);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredDate(null);
                    setPopoverPosition(null);
                  }}
                  onFocus={() => setFocusedDate(day)}
                  disabled={!isCurrentMonth || !hasDebates}
                  tabIndex={isCurrentMonth && hasDebates ? 0 : -1}
                  className={`
                    relative w-full h-10 p-0.5 text-sm rounded-lg transition-all
                    ${isCurrentMonth ? 'text-text-primary' : 'text-text-tertiary'}
                    ${hasDebates && isCurrentMonth ? 'cursor-pointer border-2 border-transparent hover:border-accent-red hover:shadow-md' : 'cursor-default border-2 border-transparent'}
                    ${isToday ? 'ring-2 ring-accent-red ring-offset-1' : ''}
                    ${isSelected ? 'bg-accent-red/30 border-accent-red' : ''}
                    ${isInRange && !isSelected ? 'bg-accent-red/10' : ''}
                    ${isInDragRange(day) && isDragging ? 'bg-accent-red/20' : ''}
                    ${!isCurrentMonth || !hasDebates ? 'opacity-40' : ''}
                    ${isFocused ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div className="text-center text-xs">{format(day, 'd')}</div>

                  {/* Debate indicator squares */}
                  {hasDebates && isCurrentMonth && (
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex flex-col gap-0.5">
                      {debate?.hasHouseDebates && (
                        <div className="w-2 h-2 rounded-sm bg-blue-500" />
                      )}
                      {debate?.hasQuestionPeriod && (
                        <div className="w-2 h-2 rounded-sm bg-red-500" />
                      )}
                      {debate?.hasCommittee && (
                        <div className="w-2 h-2 rounded-sm bg-green-500" />
                      )}
                      {debate?.hasScheduledMeeting && (
                        <div className="w-2 h-2 rounded-sm border-2 border-purple-500" />
                      )}
                    </div>
                  )}
                </button>

                {/* Rich hover popover */}
                {isHovered && debate && popoverPosition && (
                  <div
                    className="fixed z-50 p-3 bg-bg-elevated border-2 border-accent-red rounded-lg shadow-xl min-w-[220px] transition-all animate-in fade-in duration-200"
                    style={{
                      top: `${popoverPosition.top + 8}px`,
                      left: `${popoverPosition.left}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="text-xs font-semibold text-text-primary mb-2">
                      {format(day, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                    </div>
                    <div className="space-y-1.5">
                      {debate.hasHouseDebates && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm bg-blue-500 flex-shrink-0" />
                          <span className="text-xs text-text-secondary">
                            {locale === 'fr' ? 'Débats de la Chambre' : 'House Debates'}
                          </span>
                        </div>
                      )}
                      {debate.hasQuestionPeriod && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm bg-red-500 flex-shrink-0" />
                          <span className="text-xs text-text-secondary">
                            {locale === 'fr' ? 'Période des questions' : 'Question Period'}
                          </span>
                        </div>
                      )}
                      {debate.hasCommittee && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm bg-green-500 flex-shrink-0" />
                          <span className="text-xs text-text-secondary">
                            {locale === 'fr' ? 'Témoignages de comité' : 'Committee Testimony'}
                          </span>
                        </div>
                      )}
                      {debate.hasScheduledMeeting && debate.scheduledMeetings.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t border-border-subtle">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-sm border-2 border-purple-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-text-primary">
                              {locale === 'fr' ? 'Réunions prévues:' : 'Scheduled Meetings:'}
                            </span>
                          </div>
                          {debate.scheduledMeetings.map((meeting, idx) => (
                            <div key={idx} className="pl-4 text-xs text-text-tertiary">
                              {meeting.committee_name}
                              {meeting.in_camera && (
                                <span className="ml-1 text-[10px] text-text-quaternary">
                                  ({locale === 'fr' ? 'huis clos' : 'in camera'})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={calendarRef} className="bg-bg-secondary border border-border-subtle rounded-lg p-4 mb-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-text-secondary" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-bg-tertiary hover:bg-bg-tertiary/80 rounded transition-colors text-text-primary"
          >
            {locale === 'fr' ? "Aujourd'hui" : 'Today'}
          </button>

          {/* View toggle */}
          <button
            onClick={toggleMonthsView}
            className="px-3 py-1 text-sm bg-bg-tertiary hover:bg-bg-tertiary/80 rounded transition-colors text-text-primary flex items-center gap-1.5"
            aria-label={monthsToShow === 1 ? 'Show 3 months' : 'Show 1 month'}
          >
            <Calendar className="h-4 w-4" />
            <span>{monthsToShow === 1 ? '3' : '1'} {locale === 'fr' ? 'mois' : 'month'}</span>
          </button>
        </div>

        {/* Selected range display with clear button */}
        {selectedStartDate && (
          <div className="flex items-center gap-2 bg-accent-red/10 px-3 py-1 rounded-lg border border-accent-red/30">
            <span className="text-sm font-medium text-text-primary">
              {format(selectedStartDate, 'MMM d', { locale: dateLocale })}
              {selectedEndDate && !isSameDay(selectedStartDate, selectedEndDate) &&
                ` - ${format(selectedEndDate, 'MMM d', { locale: dateLocale })}`}
            </span>
            <button
              onClick={clearSelection}
              className="p-0.5 hover:bg-accent-red/20 rounded transition-colors"
              aria-label="Clear selection"
              title={locale === 'fr' ? 'Effacer (ESC)' : 'Clear (ESC)'}
            >
              <X className="h-4 w-4 text-accent-red" />
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-text-secondary flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-blue-500" />
          <span>{locale === 'fr' ? 'Chambre' : 'House'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span>{locale === 'fr' ? 'PQ' : 'QP'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span>{locale === 'fr' ? 'Comité' : 'Committee'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm border-2 border-purple-500" />
          <span>{locale === 'fr' ? 'Prévue' : 'Scheduled'}</span>
        </div>
        <div className="text-text-tertiary italic ml-auto">
          {locale === 'fr' ? 'Glisser pour sélectionner une plage' : 'Drag to select range'}
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="text-center text-text-tertiary py-8">
          {locale === 'fr' ? 'Chargement...' : 'Loading...'}
        </div>
      ) : (
        <div className={`grid gap-4 ${monthsToShow === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {monthsToShow === 3 ? (
            <>
              {renderMonth(previousMonth)}
              {renderMonth(currentMonth)}
              {renderMonth(nextMonth)}
            </>
          ) : (
            renderMonth(currentMonth)
          )}
        </div>
      )}
    </div>
  );
}
