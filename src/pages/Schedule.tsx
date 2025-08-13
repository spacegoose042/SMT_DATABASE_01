import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  CogIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSocket } from '../contexts/SocketContext.tsx';

interface WorkOrder {
  id: string;
  work_order_number: string;
  quantity: number;
  status: string;
  clear_to_build: boolean; // New field
  kit_date: string | null;
  ship_date: string | null;
  setup_hours_estimated: number | null;
  production_time_hours_estimated: number | null;
  production_time_days_estimated: number | null;
  setup_hours_actual: number | null;
  production_time_hours_actual: number | null;
  production_time_days_actual: number | null;
  completion_date: string | null;
  trolley_number: number | null;
  line_id: string | null;
  line_position: number | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  is_hand_placed: boolean;
  created_at: string;
  updated_at: string;
  assembly_number: string;
  revision: string;
  description: string | null;
  customer_name: string;
  customer_id: string;
  line_name: string | null;
  line_type: string | null;
}

interface ProductionLine {
  id: string;
  line_name: string;
  line_type: string;
  status: string;
  current_utilization: number;
  available_capacity: number;
  time_multiplier: number;
  hours_per_shift: number;
  shifts_per_day: number;
  days_per_week: number;
  start_time: string;
  end_time: string;
  lunch_break_duration: number;
  lunch_break_start: string;
  break_duration: number;
  auto_schedule_enabled?: boolean;
  maintenance_interval_days?: number;
  efficiency_target?: number;
  next_available_slot?: string;
}

interface ScheduleConfig {
  hours_per_day: number;
  days_per_week: number;
  efficiency_factor: number;
}

interface LineConfig {
  hours_per_shift: number;
  shifts_per_day: number;
  days_per_week: number;
  time_multiplier: number;
  start_time: string;
  end_time: string;
  lunch_break_duration: number;
  lunch_break_start: string;
  break_duration: number;
  auto_schedule_enabled: boolean;
  maintenance_interval_days: number;
  efficiency_target: number;
}

interface TimelineSlot {
  workOrder: WorkOrder;
  startTime: string;
  endTime: string;
  duration: number;
  position: number;
}

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const { onWorkOrderUpdate } = useSocket();
  
  // State management
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    hours_per_day: 8,
    days_per_week: 5,
    efficiency_factor: 1.0
  });
  
  // UI State
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'list'>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draggedWorkOrder, setDraggedWorkOrder] = useState<WorkOrder | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLineConfigModal, setShowLineConfigModal] = useState(false);
  const [selectedLineForConfig, setSelectedLineForConfig] = useState<ProductionLine | null>(null);
  const [editingLineConfig, setEditingLineConfig] = useState<LineConfig | null>(null);
  const [autoScheduleRunning, setAutoScheduleRunning] = useState(false);

  // API base URL - use production for local development since local database isn't set up
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin
    : 'https://smtdatabase01-production.up.railway.app';

  // Fetch work orders
  const fetchWorkOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/schedule/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch work orders');
      
      const data = await response.json();
      console.log('📥 API Response - Total work orders:', data.work_orders?.length || 0);
      
      // Debug: Check scheduled work orders in API response
      const scheduledInResponse = (data.work_orders || []).filter((wo: WorkOrder) => wo.scheduled_start_time);
      console.log('📅 Work orders with scheduled_start_time in API response:', scheduledInResponse.length);
      
      if (scheduledInResponse.length > 0) {
        console.log('📋 First few scheduled work orders from API:', scheduledInResponse.slice(0, 3).map((wo: WorkOrder) => ({
          number: wo.work_order_number,
          start: wo.scheduled_start_time,
          end: wo.scheduled_end_time,
          line: wo.line_name
        })));
      }
      
      setWorkOrders(data.work_orders || []);
    } catch (err) {
      console.error('Error fetching work orders:', err);
      setError('Failed to load work orders');
    }
  }, [baseUrl]);

  // Fetch production lines
  const fetchProductionLines = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${baseUrl}/api/production-lines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch production lines');
      
      const data = await response.json();
      setProductionLines(data.production_lines || []);
    } catch (err) {
      console.error('Error fetching production lines:', err);
      setError('Failed to load production lines');
    }
  }, [baseUrl]);

  // Update work order schedule
  const updateWorkOrderSchedule = useCallback(async (workOrderId: string, scheduleData: any) => {
    try {
      const response = await fetch(`${baseUrl}/api/schedule/work-orders/${workOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) throw new Error('Failed to update schedule');
      
      return await response.json();
    } catch (err) {
      console.error('Error updating schedule:', err);
      throw err;
    }
  }, [baseUrl]);

  // Enhanced auto-schedule algorithm
  const runAutoSchedule = useCallback(async () => {
    if (!user || !['admin', 'scheduler'].includes(user.role)) {
      setError('Insufficient permissions for auto-scheduling');
      return;
    }

    console.log('🚀 Starting auto-schedule...');
    console.log('👤 User role:', user.role);
    console.log('🌐 Base URL:', baseUrl);
    console.log('🔑 Auth token exists:', !!localStorage.getItem('auth_token'));

    setAutoScheduleRunning(true);
    try {
      // Get available work orders (not completed, cancelled, or already scheduled)
      const availableWorkOrders = workOrders.filter(wo => 
        wo.status !== 'Completed' && 
        wo.status !== 'Cancelled' && 
        !wo.scheduled_start_time
        // Note: clear_to_build filtering removed for now since column doesn't exist in DB
      );

      // Debug logging
      console.log('Total work orders:', workOrders.length);
      console.log('Available work orders:', availableWorkOrders.length);
      console.log('Work order statuses:', [...new Set(workOrders.map(wo => wo.status))]);
      console.log('Scheduled work orders:', workOrders.filter(wo => wo.scheduled_start_time).length);
      console.log('Clear to build statuses:', [...new Set(workOrders.map(wo => wo.clear_to_build))]);

      // Get available production lines (exclude Hand Placement and disabled lines)
      const availableLines = productionLines.filter(line => 
        line.status !== 'maintenance' &&
        line.status !== 'down' &&
        !line.line_name.toLowerCase().includes('hand') &&
        line.auto_schedule_enabled !== false
      );

      // Debug logging for production lines
      console.log('Total production lines:', productionLines.length);
      console.log('Available production lines:', availableLines.length);
      console.log('Line statuses:', [...new Set(productionLines.map(line => line.status))]);
      console.log('Line names:', productionLines.map(line => line.line_name));

      if (availableWorkOrders.length === 0) {
        const totalWorkOrders = workOrders.length;
        const completedWorkOrders = workOrders.filter(wo => wo.status === 'Completed').length;
        const cancelledWorkOrders = workOrders.filter(wo => wo.status === 'Cancelled').length;
        const scheduledWorkOrders = workOrders.filter(wo => wo.scheduled_start_time).length;
                setError(`No work orders available for scheduling. Total: ${totalWorkOrders}, Completed: ${completedWorkOrders}, Cancelled: ${cancelledWorkOrders}, Already Scheduled: ${scheduledWorkOrders}`);
        return;
      }

      if (availableLines.length === 0) {
        const totalLines = productionLines.length;
        const maintenanceLines = productionLines.filter(line => line.status === 'maintenance').length;
        const downLines = productionLines.filter(line => line.status === 'down').length;
        const handPlacementLines = productionLines.filter(line => line.line_name.toLowerCase().includes('hand')).length;
        const disabledLines = productionLines.filter(line => line.auto_schedule_enabled === false).length;
        
        setError(`No production lines available for scheduling. Total: ${totalLines}, Maintenance: ${maintenanceLines}, Down: ${downLines}, Hand Placement: ${handPlacementLines}, Auto-schedule Disabled: ${disabledLines}`);
        return;
      }

      // Enhanced priority scoring system focused on due date adherence
      const calculateWorkOrderPriority = (wo: WorkOrder) => {
        let priority = 0;
        
        // Ship date priority - primary factor (finish as close to due date as possible)
        if (wo.ship_date) {
          const daysUntilShip = Math.ceil((new Date(wo.ship_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilShip <= 0) {
            // Past due - HIGHEST priority
            priority += 1000 + Math.abs(daysUntilShip);
          } else if (daysUntilShip <= 21) {
            // Due within 3 weeks - high priority, closer to due date = higher priority
            priority += 500 + (21 - daysUntilShip) * 20;
          } else {
            // Due further out - lower priority
            priority += Math.max(0, 100 - daysUntilShip);
          }
        } else {
          // No ship date - medium priority
          priority += 200;
        }
        
        // Kit date priority (secondary factor)
        if (wo.kit_date) {
          const daysUntilKit = Math.ceil((new Date(wo.kit_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilKit <= 7) {
            priority += Math.max(0, 7 - daysUntilKit) * 5;
          }
        }
        
        // Status priority (ready work orders should be scheduled)
        const statusPriority = {
          'Ready': 50,
          'Ready*': 50,
          '1st Side Ready': 45,
          'In Progress': 40,
          'Pending': 20,
          'On Hold': 5
        };
        priority += statusPriority[wo.status as keyof typeof statusPriority] || 0;
        
        return priority;
      };

      // Sort work orders by enhanced priority
      const prioritizedWorkOrders = [...availableWorkOrders].sort((a, b) => {
        const priorityA = calculateWorkOrderPriority(a);
        const priorityB = calculateWorkOrderPriority(b);
        return priorityB - priorityA; // Higher priority first
      });

      // Line scoring system
      const calculateLineScore = (line: ProductionLine, workOrder: WorkOrder) => {
        let score = 0;
        
        // Calculate work order duration
        const setupHours = workOrder.setup_hours_estimated || 0;
        const productionHours = workOrder.production_time_hours_estimated || 0;
        const productionDays = workOrder.production_time_days_estimated || 0;
        const totalDurationHours = setupHours + productionHours + (productionDays * 8);
        
        // Daily capacity preference (prefer lines with higher daily capacity)
        const dailyCapacity = (line.shifts_per_day || 1) * (line.hours_per_shift || 8);
        score += dailyCapacity * 2; // Directly reward higher daily capacity
        
        // Available capacity bonus (remaining capacity for more work)
        score += (line.available_capacity || 0) * 3;
        
        // Efficiency score (prefer more efficient lines)
        score += (line.efficiency_target || 85) / 10;
        
        // Time multiplier preference (prefer lines with lower multipliers for faster processing)
        score += (1 / (line.time_multiplier || 1.0)) * 10;
        
        // Line type preference (prefer SMT over other types)
        if (line.line_type === 'SMT') {
          score += 15;
        }
        
        // Current utilization (prefer less busy lines)
        score += (1 - (line.current_utilization || 0) / 100) * 10;
        
        return score;
      };

      // Track scheduled work orders for conflict detection
      const scheduledWorkOrders = workOrders.filter(wo => wo.scheduled_start_time);
      
      // Schedule work orders
      for (const workOrder of prioritizedWorkOrders) {
        // Calculate work order duration
        const setupHours = workOrder.setup_hours_estimated || 0;
        const productionHours = workOrder.production_time_hours_estimated || 0;
        const productionDays = workOrder.production_time_days_estimated || 0;
        const totalDurationHours = setupHours + productionHours + (productionDays * 8);

        // Find best line for this work order
        let bestLine: ProductionLine | null = null;
        let bestScore = -1;
        let bestStartTime: Date | null = null;

        for (const line of availableLines) {
          console.log(`🔍 Checking line ${line.line_name}:`);
          
          // Calculate daily capacity for this line
          const dailyCapacity = (line.shifts_per_day || 1) * (line.hours_per_shift || 8);
          console.log(`  Daily capacity: ${dailyCapacity} hours/day`);
          console.log(`  Required duration: ${totalDurationHours} hours total`);
          
                  // Calculate how many days this work order will need
        const daysRequired = Math.ceil(totalDurationHours / dailyCapacity);
        console.log(`  Days required: ${daysRequired} days`);
        
        // Special logging for long work orders
        if (totalDurationHours > 50) {
          console.log(`🚨 LONG WORK ORDER: ${workOrder.work_order_number} needs ${totalDurationHours}h (${daysRequired} days)`);
          console.log(`  Line: ${line.line_name} (${dailyCapacity}h/day)`);
          console.log(`  Due date: ${workOrder.ship_date}`);
        }
          
          // Check if work order can fit within daily capacity (even if it spans multiple days)
          if (dailyCapacity === 0) {
            console.log(`  ❌ No daily capacity configured`);
            continue;
          }

                  // Calculate line score
        const lineScore = calculateLineScore(line, workOrder);
        console.log(`  📊 Line score: ${lineScore}`);
        console.log(`  📋 Line details: capacity=${line.available_capacity}, shifts=${line.shifts_per_day}, hours=${line.hours_per_shift}, multiplier=${line.time_multiplier}`);
          
          // Find best available multi-day slot on this line (considering due dates)
          const availableSlot = findBestMultiDaySlot(line, workOrder, scheduledWorkOrders, selectedDate, daysRequired);
          console.log(`  ⏰ Available slot: ${availableSlot ? availableSlot.toISOString() : 'None'}`);
          
          if (availableSlot && lineScore > bestScore) {
            console.log(`  ✅ New best line!`);
            bestLine = line;
            bestScore = lineScore;
            bestStartTime = availableSlot;
          }
        }

        if (bestLine && bestStartTime) {
          // Calculate end time for multi-day scheduling
          const adjustedDuration = totalDurationHours * (bestLine.time_multiplier || 1.0);
          const dailyCapacity = (bestLine.shifts_per_day || 1) * (bestLine.hours_per_shift || 8);
          const daysRequired = Math.ceil(adjustedDuration / dailyCapacity);
          
          // Calculate actual end time considering daily work hours
          const endTime = new Date(bestStartTime);
          const workingHoursPerDay = bestLine.hours_per_shift || 8;
          
          if (daysRequired === 1) {
            // Single day: just add the duration
            endTime.setHours(endTime.getHours() + adjustedDuration);
          } else {
            // Multi-day: calculate based on working days and daily capacity
            let remainingHours = adjustedDuration;
            let currentDay = new Date(bestStartTime);
            
            while (remainingHours > 0) {
              const hoursThisDay = Math.min(remainingHours, workingHoursPerDay);
              remainingHours -= hoursThisDay;
              
              if (remainingHours > 0) {
                // Move to next working day
                currentDay.setDate(currentDay.getDate() + 1);
                // Skip weekends if line doesn't work weekends
                while ((bestLine.days_per_week || 5) === 5 && (currentDay.getDay() === 0 || currentDay.getDay() === 6)) {
                  currentDay.setDate(currentDay.getDate() + 1);
                }
              } else {
                // Last day - calculate exact end time
                const [startHour] = (bestLine.start_time || '08:00').split(':').map(Number);
                currentDay.setHours(startHour + hoursThisDay);
              }
            }
            
            endTime.setTime(currentDay.getTime());
          }

          console.log(`📅 Scheduling work order ${workOrder.work_order_number} on ${bestLine.line_name}`);
          console.log(`⏰ Start: ${bestStartTime.toISOString()}, End: ${endTime.toISOString()}`);
          console.log(`🆔 Work Order ID being sent to API: "${workOrder.id}" (type: ${typeof workOrder.id})`);

          // Update work order with schedule
          try {
            await updateWorkOrderSchedule(workOrder.id, {
              line_id: bestLine.id,
              scheduled_start_time: bestStartTime.toISOString(),
              scheduled_end_time: endTime.toISOString(),
              line_position: 1
            });
            console.log(`✅ Successfully scheduled work order ${workOrder.work_order_number}`);
          } catch (scheduleError) {
            console.error(`❌ Failed to schedule work order ${workOrder.work_order_number}:`, scheduleError);
            throw new Error(`Failed to schedule work order ${workOrder.work_order_number}: ${scheduleError.message}`);
          }

          // Add to scheduled work orders for conflict detection
          scheduledWorkOrders.push({
            ...workOrder,
            line_id: bestLine.id,
            scheduled_start_time: bestStartTime.toISOString(),
            scheduled_end_time: endTime.toISOString()
          });
        }
      }

      // Refresh data
      console.log('🔄 Refreshing work orders after auto-scheduling...');
      await fetchWorkOrders();
      
      // Debug: Check if work orders have scheduled times after refresh (use a ref to avoid stale closure)
      setTimeout(() => {
        const currentWorkOrders = workOrders; // This might be stale, let's remove this debug for now
        console.log('🔄 Data refresh completed after auto-scheduling');
      }, 100);
      
      setSuccessMessage('Auto-schedule completed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setError(null);
    } catch (err) {
      console.error('Auto-schedule error:', err);
      setError('Auto-scheduling failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setAutoScheduleRunning(false);
    }
  }, [productionLines, selectedDate, user, updateWorkOrderSchedule, fetchWorkOrders]);

  // Helper function to find best available multi-day time slot considering due dates
  const findBestMultiDaySlot = (
    line: ProductionLine, 
    workOrder: WorkOrder, 
    scheduledWorkOrders: WorkOrder[], 
    targetDate: string,
    daysRequired: number
  ): Date | null => {
    const earliestSlot = findEarliestMultiDaySlot(line, workOrder, scheduledWorkOrders, targetDate, daysRequired);
    if (!earliestSlot || !workOrder.ship_date) {
      return earliestSlot;
    }

    // Calculate work order duration for end date calculation
    const setupHours = workOrder.setup_hours_estimated || 0;
    const productionHours = workOrder.production_time_hours_estimated || 0;
    const productionDays = workOrder.production_time_days_estimated || 0;
    const totalDurationHours = setupHours + productionHours + (productionDays * 8);
    const adjustedDuration = totalDurationHours * (line.time_multiplier || 1.0);
    const dailyCapacity = (line.shifts_per_day || 1) * (line.hours_per_shift || 8);
    
    const shipDate = new Date(workOrder.ship_date);
    const earliestDaysFromStart = Math.ceil(adjustedDuration / dailyCapacity);
    
    // Calculate earliest finish date
    const earliestEndDate = new Date(earliestSlot);
    let remainingDays = earliestDaysFromStart;
    while (remainingDays > 0) {
      earliestEndDate.setDate(earliestEndDate.getDate() + 1);
      // Skip weekends if line doesn't work weekends
      const dayOfWeek = earliestEndDate.getDay();
      if ((line.days_per_week || 5) === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }
      remainingDays--;
    }

    // If earliest finish is more than 3 weeks before due date, try to find a later slot
    const threeWeeksBeforeDue = new Date(shipDate);
    threeWeeksBeforeDue.setDate(threeWeeksBeforeDue.getDate() - 21);
    
    if (earliestEndDate < threeWeeksBeforeDue) {
      // Try to find a slot that finishes closer to the due date
      const targetStartDate = new Date(threeWeeksBeforeDue);
      targetStartDate.setDate(targetStartDate.getDate() - earliestDaysFromStart);
      
      const laterSlot = findEarliestMultiDaySlot(line, workOrder, scheduledWorkOrders, targetStartDate.toISOString().split('T')[0], daysRequired);
      if (laterSlot) {
        return laterSlot;
      }
    }

    return earliestSlot;
  };

  // Helper function to find earliest available multi-day time slot
  const findEarliestMultiDaySlot = (
    line: ProductionLine, 
    workOrder: WorkOrder, 
    scheduledWorkOrders: WorkOrder[], 
    targetDate: string,
    daysRequired: number
  ): Date | null => {
    // Parse line work hours
    const startTimeStr = line.start_time || '08:00';
    const endTimeStr = line.end_time || '17:00';
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    // Calculate daily capacity and work order duration
    const dailyCapacity = (line.shifts_per_day || 1) * (line.hours_per_shift || 8);
    const setupHours = workOrder.setup_hours_estimated || 0;
    const productionHours = workOrder.production_time_hours_estimated || 0;
    const productionDays = workOrder.production_time_days_estimated || 0;
    const totalDurationHours = setupHours + productionHours + (productionDays * 8);

    // Start checking from the target date
    let checkDate = new Date(targetDate);
    // Extended look-ahead for very long work orders that need more time
    const adjustedDuration = (workOrder.setup_hours_estimated || 0) + 
                            (workOrder.production_time_hours_estimated || 0) + 
                            ((workOrder.production_time_days_estimated || 0) * 8);
    const lineDailyCapacity = (line.shifts_per_day || 1) * (line.hours_per_shift || 8);
    const estimatedDays = Math.ceil(adjustedDuration / Math.max(lineDailyCapacity, 1));
    
    // Use longer look-ahead for work orders that need more than 30 days
    const maxLookAhead = estimatedDays > 30 ? Math.min(90, estimatedDays + 30) : 45;
    
    for (let dayOffset = 0; dayOffset < maxLookAhead; dayOffset++) {
      const currentCheckDate = new Date(checkDate);
      currentCheckDate.setDate(checkDate.getDate() + dayOffset);
      
      // Skip weekends if line doesn't work weekends
      const dayOfWeek = currentCheckDate.getDay();
      if ((line.days_per_week || 5) === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      // Check if we have consecutive available days starting from this date
      let consecutiveDaysAvailable = true;
      
      for (let dayIndex = 0; dayIndex < daysRequired; dayIndex++) {
        const checkingDate = new Date(currentCheckDate);
        checkingDate.setDate(currentCheckDate.getDate() + dayIndex);
        
        // Skip weekends for additional days too
        const checkingDayOfWeek = checkingDate.getDay();
        if ((line.days_per_week || 5) === 5 && (checkingDayOfWeek === 0 || checkingDayOfWeek === 6)) {
          consecutiveDaysAvailable = false;
          break;
        }

        // Get existing schedules for this line on this specific date
        const daySchedules = scheduledWorkOrders.filter(wo => 
          wo.line_id === line.id && 
          wo.scheduled_start_time &&
          wo.scheduled_end_time &&
          new Date(wo.scheduled_start_time).toDateString() === checkingDate.toDateString()
        );

        // Calculate how much capacity is used this day
        const usedCapacity = daySchedules.reduce((total, wo) => {
          const start = new Date(wo.scheduled_start_time!);
          const end = new Date(wo.scheduled_end_time!);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
          return total + duration;
        }, 0);

        // Check if we have enough remaining capacity for this day's portion
        const dailyHoursNeeded = Math.min(totalDurationHours - (dayIndex * dailyCapacity), dailyCapacity);
        
        if (usedCapacity + dailyHoursNeeded > dailyCapacity) {
          consecutiveDaysAvailable = false;
          break;
        }
      }

      if (consecutiveDaysAvailable) {
        // Found a valid starting date - return the start time
        const startTime = new Date(currentCheckDate);
        startTime.setHours(startHour, startMinute, 0, 0);
        return startTime;
      }
    }

    return null;
  };

  // Helper function to find earliest available time slot
  const findEarliestAvailableSlot = (
    line: ProductionLine, 
    workOrder: WorkOrder, 
    scheduledWorkOrders: WorkOrder[], 
    targetDate: string
  ): Date | null => {
    // Parse line work hours
    const startTimeStr = line.start_time || '08:00';
    const endTimeStr = line.end_time || '17:00';
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    // Calculate work order duration
    const setupHours = workOrder.setup_hours_estimated || 0;
    const productionHours = workOrder.production_time_hours_estimated || 0;
    const productionDays = workOrder.production_time_days_estimated || 0;
    const totalDurationHours = setupHours + productionHours + (productionDays * 8);
    const adjustedDuration = totalDurationHours * (line.time_multiplier || 1.0);

    // Get existing schedules for this line on the target date
    const lineSchedules = scheduledWorkOrders.filter(wo => 
      wo.line_id === line.id && 
      wo.scheduled_start_time &&
      wo.scheduled_end_time &&
      new Date(wo.scheduled_start_time).toDateString() === new Date(targetDate).toDateString()
    ).sort((a, b) => 
      new Date(a.scheduled_start_time!).getTime() - new Date(b.scheduled_start_time!).getTime()
    );

    // Start with line opening time
    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    // Check each potential time slot
    while (currentTime.getHours() < endHour) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setHours(slotEndTime.getHours() + adjustedDuration);

      // Check if slot extends beyond line closing time
      if (slotEndTime.getHours() > endHour) {
        // Move to next day
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(startHour, startMinute, 0, 0);
        continue;
      }

      // Check for conflicts with existing schedules
      const hasConflict = lineSchedules.some(schedule => {
        const scheduleStart = new Date(schedule.scheduled_start_time!);
        const scheduleEnd = new Date(schedule.scheduled_end_time!);
        
        return (
          (currentTime >= scheduleStart && currentTime < scheduleEnd) ||
          (slotEndTime > scheduleStart && slotEndTime <= scheduleEnd) ||
          (currentTime <= scheduleStart && slotEndTime >= scheduleEnd)
        );
      });

      if (!hasConflict) {
        return currentTime;
      }

      // Move to next potential slot (after the conflicting schedule)
      const nextConflict = lineSchedules.find(schedule => {
        const scheduleStart = new Date(schedule.scheduled_start_time!);
        return scheduleStart >= currentTime;
      });

      if (nextConflict) {
        currentTime = new Date(nextConflict.scheduled_end_time!);
      } else {
        // No more conflicts, but check if we still have time today
        if (currentTime.getHours() + adjustedDuration <= endHour) {
          return currentTime;
        } else {
          // Move to next day
          currentTime.setDate(currentTime.getDate() + 1);
          currentTime.setHours(startHour, startMinute, 0, 0);
        }
      }
    }

    return null;
  };

  // Line configuration functions
  const openLineConfig = (line: ProductionLine) => {
    setSelectedLineForConfig(line);
    setEditingLineConfig({
      hours_per_shift: line.hours_per_shift || 8,
      shifts_per_day: line.shifts_per_day || 1,
      days_per_week: line.days_per_week || 5,
      time_multiplier: line.time_multiplier || 1.0,
      start_time: line.start_time || '08:00',
      end_time: line.end_time || '17:00',
      lunch_break_duration: line.lunch_break_duration || 60,
      lunch_break_start: line.lunch_break_start || '12:00',
      break_duration: line.break_duration || 15,
      auto_schedule_enabled: true,
      maintenance_interval_days: 30,
      efficiency_target: 85
    });
    setShowLineConfigModal(true);
  };

  const updateLineConfig = async (lineId: string, config: LineConfig) => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Updating line config for:', lineId, 'with config:', config);
      
      const response = await fetch(`${baseUrl}/api/production-lines/${lineId}/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Response error:', errorData);
        throw new Error(`Failed to update line configuration: ${response.status} ${errorData}`);
      }
      
      const result = await response.json();
      console.log('Update successful:', result);
      
      // Refresh production lines data
      await fetchProductionLines();
      setShowLineConfigModal(false);
      setSelectedLineForConfig(null);
      setEditingLineConfig(null);
      setError(null); // Clear any previous errors
      setSuccessMessage(`Line configuration updated successfully for ${selectedLineForConfig?.line_name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating line config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update line configuration');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (workOrder: WorkOrder) => {
    setDraggedWorkOrder(workOrder);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetLineId: string, targetTime: string) => {
    e.preventDefault();
    
    if (!draggedWorkOrder) return;

    try {
      const targetDateTime = new Date(`${selectedDate}T${targetTime}`);
      const endDateTime = new Date(targetDateTime);
      
      // Calculate total duration from available time fields
      const setupHours = draggedWorkOrder.setup_hours_estimated || 0;
      const productionHours = draggedWorkOrder.production_time_hours_estimated || 0;
      const productionDays = draggedWorkOrder.production_time_days_estimated || 0;
      const totalDurationHours = setupHours + productionHours + (productionDays * 8);
      
      endDateTime.setHours(endDateTime.getHours() + totalDurationHours);

      await updateWorkOrderSchedule(draggedWorkOrder.id, {
        line_id: targetLineId,
        scheduled_start_time: targetDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString()
      });

      // Refresh data
      await fetchWorkOrders();
      setDraggedWorkOrder(null);
    } catch (err) {
      console.error('Drop error:', err);
      setError('Failed to schedule work order');
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkOrders(), fetchProductionLines()]);
      setLoading(false);
    };

    loadData();
  }, [fetchWorkOrders, fetchProductionLines]);

  // Real-time updates - using the context's event system
  useEffect(() => {
    const unsubscribe = onWorkOrderUpdate(() => {
      fetchWorkOrders();
    });

    return unsubscribe;
  }, [onWorkOrderUpdate, fetchWorkOrders]);

  // Filter work orders by selected line
  const filteredWorkOrders = selectedLine === 'all' 
    ? workOrders 
    : workOrders.filter(wo => wo.line_name === selectedLine);

  // Generate timeline slots
  const generateTimelineSlots = () => {
    const slots: TimelineSlot[] = [];

    filteredWorkOrders.forEach((workOrder, index) => {
      if (workOrder.scheduled_start_time) {
        const startTime = new Date(workOrder.scheduled_start_time);
        const endTime = workOrder.scheduled_end_time ? new Date(workOrder.scheduled_end_time) : startTime;
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

        slots.push({
          workOrder,
          startTime: startTime.toTimeString().slice(0, 5),
          endTime: endTime.toTimeString().slice(0, 5),
          duration,
          position: index
        });
      }
    });

    return slots;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 text-sy-green-600 mx-auto mb-4 animate-spin" />
          <p className="text-sy-black-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sy-black-900">Production Schedule</h1>
          <p className="mt-1 text-sm text-sy-black-600">
            Manage and optimize production scheduling
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-sy-black-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sy-green-500"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Config
          </button>
          
          {user && ['admin', 'scheduler'].includes(user.role) && (
            <div className="flex items-center space-x-3">
              <button
                onClick={runAutoSchedule}
                disabled={autoScheduleRunning}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sy-green-600 hover:bg-sy-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sy-green-500 disabled:opacity-50"
              >
                {autoScheduleRunning ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarIcon className="h-4 w-4 mr-2" />
                )}
                {autoScheduleRunning ? 'Scheduling...' : 'Auto Schedule'}
              </button>
              <div className="text-xs text-sy-black-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1">
                  Manual Only
                </span>
                Hand Placement excluded
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="mt-1 text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-sy-black-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
            />
          </div>

          {/* Line Filter */}
          <div>
            <label className="block text-sm font-medium text-sy-black-700 mb-2">
              Production Line
            </label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
            >
              <option value="all">All Lines</option>
              {productionLines.map(line => (
                <option key={line.id} value={line.line_name}>
                  {line.line_name}
                  {line.line_name.toLowerCase().includes('hand') ? ' (Manual Only)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-sy-black-700 mb-2">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
            >
              <option value="timeline">Timeline</option>
              <option value="calendar">Calendar</option>
              <option value="list">List</option>
            </select>
          </div>

          {/* Stats */}
          <div>
            <label className="block text-sm font-medium text-sy-black-700 mb-2">
              Summary
            </label>
            <div className="text-sm text-sy-black-600">
              {filteredWorkOrders.length} work orders
              <br />
              {filteredWorkOrders.filter(wo => wo.scheduled_start_time).length} scheduled
            </div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-sy-black-900">Timeline View</h3>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Time Headers */}
              <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: '200px repeat(12, 1fr)' }}>
                <div className="p-3 text-sm font-medium text-sy-black-700">Line</div>
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="p-3 text-sm font-medium text-sy-black-700 text-center border-l border-gray-200">
                    {8 + i}:00
                  </div>
                ))}
              </div>

              {/* Production Lines */}
              {productionLines.map(line => (
                <div key={line.id} className="grid border-b border-gray-200" style={{ gridTemplateColumns: '200px repeat(12, 1fr)' }}>
                  <div className="p-3 text-sm font-medium text-sy-black-900 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{line.line_name}</span>
                        {line.line_name.toLowerCase().includes('hand') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Manual Only
                          </span>
                        )}
                      </div>
                      {user && ['admin', 'scheduler'].includes(user.role) && (
                        <button
                          onClick={() => openLineConfig(line)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-sy-black-700 bg-white hover:bg-gray-50"
                          title="Configure line settings"
                        >
                          <CogIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {Array.from({ length: 12 }, (_, i) => {
                    const timeSlot = `${8 + i}:00`;
                    const scheduledWorkOrder = generateTimelineSlots().find(slot => 
                      slot.workOrder.line_name === line.line_name &&
                      slot.startTime === timeSlot
                    );

                    return (
                      <div
                        key={i}
                        className="p-2 border-l border-gray-200 min-h-[60px] relative"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, line.id, timeSlot)}
                      >
                        {scheduledWorkOrder ? (
                          <div className="bg-sy-green-100 border border-sy-green-300 rounded p-2 text-xs">
                            <div className="font-medium text-sy-green-800">
                              {scheduledWorkOrder.workOrder.work_order_number}
                            </div>
                            <div className="text-sy-green-600">
                              {scheduledWorkOrder.duration}h
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">Available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-sy-black-900">Calendar View</h3>
            <p className="mt-1 text-sm text-sy-black-600">
              Scheduled work orders by date ({filteredWorkOrders.filter(wo => wo.scheduled_start_time).length} scheduled)
            </p>
          </div>
          
          <div className="p-6">
            {(() => {
              // Group scheduled work orders by date
              const workOrdersByDate = filteredWorkOrders
                .filter(wo => wo.scheduled_start_time)
                .reduce((acc, wo) => {
                  const startDate = new Date(wo.scheduled_start_time!).toISOString().split('T')[0];
                  if (!acc[startDate]) acc[startDate] = [];
                  acc[startDate].push(wo);
                  return acc;
                }, {} as Record<string, typeof filteredWorkOrders>);

              // Sort dates
              const sortedDates = Object.keys(workOrdersByDate).sort();

              if (sortedDates.length === 0) {
                return (
                  <div className="text-center py-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-sy-black-900">No scheduled work orders</h3>
                    <p className="mt-1 text-sm text-sy-black-500">
                      Run auto-scheduling to see work orders on the calendar.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {sortedDates.map(date => {
                    const orders = workOrdersByDate[date];
                    const dateObj = new Date(date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    return (
                      <div key={date} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h4 className="text-lg font-medium text-sy-black-900">
                            {dayName}, {monthDay}
                            <span className="ml-2 text-sm font-normal text-sy-black-500">
                              ({orders.length} work order{orders.length !== 1 ? 's' : ''})
                            </span>
                          </h4>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          {orders.map(wo => {
                            const startTime = new Date(wo.scheduled_start_time!);
                            const endTime = wo.scheduled_end_time ? new Date(wo.scheduled_end_time) : null;
                            const duration = wo.setup_hours_estimated + wo.production_time_hours_estimated + (wo.production_time_days_estimated * 8);
                            
                            return (
                              <div key={wo.id} className="flex items-center justify-between p-3 bg-sy-black-50 rounded border border-gray-200">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4">
                                    <div className="font-medium text-sy-black-900">
                                      {wo.work_order_number}
                                    </div>
                                    <div className="text-sm text-sy-black-600">
                                      {wo.customer_name}
                                    </div>
                                    <div className="text-sm text-sy-black-500">
                                      {wo.assembly_number} (Qty: {wo.quantity})
                                    </div>
                                  </div>
                                  <div className="mt-1 text-xs text-sy-black-500">
                                    {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    {endTime && ` - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                                    • {duration.toFixed(1)}h duration
                                    • {wo.line_name}
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    wo.status === 'Ready' || wo.status === 'Ready*' 
                                      ? 'bg-green-100 text-green-800'
                                      : wo.status === '1st Side Ready'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {wo.status}
                                  </div>
                                  {wo.ship_date && (
                                    <div className="mt-1 text-xs text-sy-black-500">
                                      Ship: {new Date(wo.ship_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Work Orders List */}
      {viewMode === 'list' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-sy-black-900">Work Orders</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Assembly
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Clear to Build
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Ship Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-sy-black-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkOrders.map((workOrder) => (
                  <tr 
                    key={workOrder.id}
                    draggable={workOrder.clear_to_build}
                    onDragStart={() => workOrder.clear_to_build && handleDragStart(workOrder)}
                    className={`hover:bg-gray-50 ${workOrder.clear_to_build ? 'cursor-move' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-sy-black-900">
                      {workOrder.work_order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-sy-black-500">
                      {workOrder.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-sy-black-500">
                      {workOrder.assembly_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workOrder.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        workOrder.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {workOrder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workOrder.clear_to_build ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {workOrder.clear_to_build ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-sy-black-500">
                      {workOrder.ship_date ? new Date(workOrder.ship_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-sy-black-500">
                      {workOrder.production_time_hours_estimated || 0}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-sy-black-500">
                      {workOrder.scheduled_start_time ? (
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                          {new Date(workOrder.scheduled_start_time).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                          Not scheduled
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        className="text-sy-green-600 hover:text-sy-green-900"
                        onClick={() => {
                          // TODO: Add toggle clear to build functionality
                          console.log('Toggle clear to build for:', workOrder.work_order_number);
                        }}
                      >
                        {workOrder.clear_to_build ? 'Mark Not Ready' : 'Mark Ready'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-sy-black-900 mb-4">Schedule Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Hours per Day
                  </label>
                  <input
                    type="number"
                    value={scheduleConfig.hours_per_day}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, hours_per_day: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Days per Week
                  </label>
                  <input
                    type="number"
                    value={scheduleConfig.days_per_week}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, days_per_week: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Efficiency Factor
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scheduleConfig.efficiency_factor}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, efficiency_factor: parseFloat(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-sy-black-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save configuration logic here
                    setShowConfigModal(false);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sy-green-600 hover:bg-sy-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Configuration Modal */}
      {showLineConfigModal && selectedLineForConfig && editingLineConfig && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => {
            setShowLineConfigModal(false);
            setSelectedLineForConfig(null);
            setEditingLineConfig(null);
          }}
        >
          <div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-sy-black-900">
                  Configure {selectedLineForConfig.line_name}
                </h3>
                <button
                  onClick={() => {
                    setShowLineConfigModal(false);
                    setSelectedLineForConfig(null);
                    setEditingLineConfig(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Hours per Shift
                  </label>
                  <input
                    type="number"
                    value={editingLineConfig.hours_per_shift}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, hours_per_shift: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Shifts per Day
                  </label>
                  <input
                    type="number"
                    value={editingLineConfig.shifts_per_day}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, shifts_per_day: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Days per Week
                  </label>
                  <input
                    type="number"
                    value={editingLineConfig.days_per_week}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, days_per_week: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Time Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingLineConfig.time_multiplier}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, time_multiplier: parseFloat(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingLineConfig.start_time}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, start_time: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingLineConfig.end_time}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, end_time: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Lunch Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingLineConfig.lunch_break_duration}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, lunch_break_duration: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Lunch Break Start Time
                  </label>
                  <input
                    type="time"
                    value={editingLineConfig.lunch_break_start}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, lunch_break_start: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sy-black-700 mb-2">
                    Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingLineConfig.break_duration}
                    onChange={(e) => setEditingLineConfig(prev => ({ ...prev!, break_duration: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLineConfigModal(false);
                    setSelectedLineForConfig(null);
                    setEditingLineConfig(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-sy-black-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateLineConfig(selectedLineForConfig.id, editingLineConfig)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sy-green-600 hover:bg-sy-green-700"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule; 
