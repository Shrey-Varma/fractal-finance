import DashboardSidebar from './DashboardSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userProfile?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export default function DashboardLayout({ children, userProfile }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar userProfile={userProfile} />
      
      {/* Main content area */}
      <div className="ml-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
} 