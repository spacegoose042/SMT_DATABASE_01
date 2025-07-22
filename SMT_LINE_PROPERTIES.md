# SMT Line Properties - Scheduling System

## Context
Low volume/high mix contract electronic manufacturing facility focused on production scheduling.

## Core SMT Line Properties:

### **Basic Information:**
- **Line Name/ID** (e.g., "Line 1", "4-EURO 586 (4) MCI")
- **Line Type** (e.g., "EURO 586", "EURO 264", "EURO 127", "EURO 588")
- **Location/Area** (e.g., "Building A", "North Bay", "Main Floor")

### **Capacity & Performance:**
- **Maximum Capacity** (number of positions/slots)
- **Time Multiplier** (Line 1 = 2.0x, others = 1.0x)
- **Setup Time** (manually entered per work order, minimum 30 min, based on part count)
- **Current Utilization** (percentage of capacity currently in use)

### **Operational Status:**
- **Active/Inactive** (for maintenance, malfunctions, etc.)
- **Status Reason** (maintenance, malfunction, scheduled downtime, estimated repair time, etc.)
- **Status Start Date/Time**
- **Expected Return Date/Time**
- **Current Status** (running, idle, setup, maintenance, down)

### **Scheduling Properties:**
- **Shifts per Day** (default: 1)
- **Hours per Shift** (default: 8)
- **Days per Week** (default: 5, M-F)
- **Lunch Break Duration** (default: 1 hour)
- **Lunch Break Time** (e.g., 12:00-13:00)
- **Skill Level Required** (operator expertise needed for this line)

### **Queue Management:**
- **Current Queue Length** (number of jobs waiting)
- **Available Capacity** (slots available for new jobs)
- **Next Available Slot** (when the next position opens up)

## Additional Considerations:

### **Trolley Management** (for later discussion):
- **Trolley Capacity per Line** (all lines can accept same amount)
- **Total Available Trolleys** (finite resource across all lines)
- **Trolley Allocation** (running + setup jobs can't exceed total)

### **Time Block Management:**
- **Line Down Time Blocks** (for maintenance, repairs, etc.)
- **Estimated Repair Time** (for scheduling purposes)
- **Manual Rescheduling** (no automatic job redistribution)

## Implementation Questions:

1. **Line Names**: Should we store both the numeric ID (Line 1, 2, 3, 4) and the specific name (4-EURO 586 (4) MCI) in the database?

2. **Shift Configuration**: Should the shift settings be:
   - Global (applies to all lines by default)
   - Line-specific (can override global settings)
   - Or both (global defaults, line-specific overrides)?

3. **Time Blocks**: For line downtime, do you want:
   - Simple start/end time blocks?
   - Recurring maintenance windows?
   - Different types of downtime (maintenance vs repair vs scheduled)?

4. **Trolley Logic**: When we get to trolley management, should it:
   - Show warnings when trolley limit is approached?
   - Prevent scheduling when trolley limit would be exceeded?
   - Just display current trolley usage for manual decision making?

## Notes:
- Setup times are manually entered per work order (not calculated)
- All lines can accept same trolley capacity
- Finite trolley resource across all lines
- No automatic job redistribution when lines go down
- Manual rescheduling required
- Line downtime handled with time blocks
- Estimated repair time for scheduling purposes 