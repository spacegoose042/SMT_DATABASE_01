# S&Y Industries UI - React Application

Modern, clean React interface for the SMT Production Schedule Database.

## 🎨 Design System

### Brand Colors
- **Primary Green**: `#16a34a` - S&Y Industries main brand color
- **Gold/Amber**: `#f59e0b` - Accent color for highlights and warnings
- **Black**: `#0f172a` - Text and strong elements
- **Light Green**: `#dcfce7` - Background accents
- **White**: `#ffffff` - Primary backgrounds

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Responsive**: Scales appropriately across devices

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Your S&Y Industries logo in `public/images/logo.png`

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Build for Production
```bash
# Build the application
npm run build

# The build folder will contain the production-ready files
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Sidebar.tsx     # Navigation sidebar
│   └── Header.tsx      # Top header bar
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── WorkOrders.tsx  # Work order management
│   ├── ProductionLines.tsx # Line management
│   ├── Schedule.tsx    # Schedule views
│   ├── Customers.tsx   # Customer management
│   ├── Reports.tsx     # Reports and analytics
│   └── Settings.tsx    # System settings
├── styles/             # Additional styling
├── assets/             # Static assets
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
└── index.css           # Global styles and Tailwind imports
```

## 🎯 Features

### Current Implementation
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **S&Y Branding**: Custom color palette and styling
- ✅ **Sidebar Navigation**: Clean, organized menu structure
- ✅ **Dashboard**: Overview with key metrics and quick actions
- ✅ **Modern UI**: Clean, professional interface
- ✅ **Mobile-First**: Touch-friendly mobile experience

### Planned Features
- 🔄 **Work Order Management**: Create, edit, and track work orders
- 🔄 **Production Line Monitoring**: Real-time line status and utilization
- 🔄 **Schedule Views**: Calendar and timeline interfaces
- 🔄 **Data Integration**: Connect to backend API
- 🔄 **Real-time Updates**: Live data synchronization
- 🔄 **Advanced Filtering**: Search and filter capabilities
- 🔄 **Export Features**: PDF and CSV generation

## 🛠️ Technology Stack

- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Headless UI**: Accessible components
- **Heroicons**: Beautiful, consistent icons
- **React Router**: Client-side routing
- **React Query**: Data fetching and caching

## 🎨 Custom Components

### Button Styles
```tsx
// Primary button (green)
<button className="btn-primary">Create Work Order</button>

// Secondary button (gold)
<button className="btn-secondary">Import CSV</button>

// Outline button
<button className="btn-outline">View Details</button>
```

### Card Components
```tsx
// Standard card
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content</p>
  </div>
</div>
```

### Status Indicators
```tsx
// Active status
<span className="status-active">Active</span>

// Warning status
<span className="status-warning">Maintenance</span>

// Inactive status
<span className="status-inactive">Inactive</span>
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Collapsible sidebar navigation
- Touch-optimized buttons and controls
- Simplified layouts for small screens
- Bottom navigation (planned)

## 🔧 Development

### Adding New Pages
1. Create new component in `src/pages/`
2. Add route to `src/App.tsx`
3. Add navigation item to `src/components/Sidebar.tsx`

### Styling Guidelines
- Use Tailwind CSS classes for styling
- Follow the S&Y color palette
- Maintain consistent spacing (8px grid)
- Use semantic class names

### Component Structure
```tsx
import React from 'react';

interface ComponentProps {
  // Define props here
}

function ComponentName({ prop1, prop2 }: ComponentProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-sy-black-900">Page Title</h1>
        <p className="mt-1 text-sm text-sy-black-600">Description</p>
      </div>
      
      {/* Content */}
      <div className="card">
        <div className="card-body">
          {/* Content here */}
        </div>
      </div>
    </div>
  );
}

export default ComponentName;
```

## 🚀 Deployment

### Railway Deployment
The UI can be deployed alongside the backend on Railway:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Serve static files** from the `build` folder
3. **Configure Railway** to serve the React app
4. **Set up routing** to handle React Router paths

### Environment Variables
```bash
REACT_APP_API_URL=https://your-railway-app.railway.app
REACT_APP_ENVIRONMENT=production
```

## 🎯 Next Steps

### Phase 2A: Core Features
1. **API Integration**: Connect to backend endpoints
2. **Work Order Management**: Full CRUD operations
3. **Production Line Monitoring**: Real-time status updates
4. **Schedule Views**: Calendar and timeline interfaces

### Phase 2B: Advanced Features
1. **Real-time Updates**: WebSocket connections
2. **Advanced Filtering**: Search and filter capabilities
3. **Export Features**: PDF and CSV generation
4. **Mobile Optimization**: Enhanced mobile experience

### Phase 2C: Polish & Performance
1. **Loading States**: Skeleton screens and spinners
2. **Error Handling**: User-friendly error messages
3. **Performance**: Code splitting and optimization
4. **Accessibility**: ARIA labels and keyboard navigation

## 📞 Support

For UI development questions:
1. Check the component documentation
2. Review the Tailwind CSS configuration
3. Consult the design system guidelines
4. Contact the development team

---

**Built with modern React and S&Y Industries branding.** 