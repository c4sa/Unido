

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import mainLogo from '../main_logo.svg';
import { 
  LayoutDashboard, 
  User, 
  Users, 
  Calendar, 
  MessageSquare, 
  MapPin,
  Shield,
  LogOut,
  CalendarDays,
  Menu,
  Building
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User as UserEntity } from "@/api/entities";
import NotificationBell from "@/components/notifications/NotificationBell";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "My Schedule",
    url: createPageUrl("Schedule"),
    icon: CalendarDays,
  },
  {
    title: "Delegates",
    url: createPageUrl("Delegates"),
    icon: Users,
  },
  {
    title: "Meetings",
    url: createPageUrl("Meetings"),
    icon: Calendar,
  },
  {
    title: "Chat",
    url: createPageUrl("Chat"),
    icon: MessageSquare,
  },
  {
    title: "Admin Settings",
    url: createPageUrl("Admin"),
    icon: Shield,
    adminOnly: true,
  },
];

const adminNavigationItems = [
  {
    title: "Rooms",
    url: createPageUrl("Rooms"),
    icon: Building,
  },
  {
    title: "Venue Schedule",
    url: createPageUrl("Venues"),
    icon: MapPin,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await UserEntity.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleLogout = async () => {
    await UserEntity.logout();
  };

  const allNavigationItems = currentUser?.role === 'admin' 
    ? [...navigationItems, ...adminNavigationItems]
    : navigationItems;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        :root {
          --primary-50: #f8fafc;
          --primary-100: #f1f5f9;
          --primary-200: #e2e8f0;
          --primary-300: #cbd5e1;
          --primary-400: #94a3b8;
          --primary-500: #64748b;
          --primary-600: #475569;
          --primary-700: #334155;
          --primary-800: #1e293b;
          --primary-900: #0f172a;
          --accent-500: #3b82f6;
          --accent-600: #2563eb;
          --accent-700: #1d4ed8;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
        }
        
        .nav-item {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: var(--accent-500);
          transition: height 0.2s ease;
          border-radius: 0 2px 2px 0;
        }
        
        .nav-item.active::before {
          height: 100%;
        }
        
        .nav-item:hover {
          background: rgba(59, 130, 246, 0.05);
          transform: translateX(2px);
        }
        
        .nav-item.active {
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-700);
        }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200/60 z-50 transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-72 lg:w-80
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-center">
              <img src={mainLogo} alt="UNIConnect Logo" className="h-16 w-auto" />
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-6 py-8">
            <div className="space-y-2">
              {allNavigationItems
                .filter(item => !item.adminOnly || currentUser?.role === 'admin')
                .map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link key={item.title} to={item.url}>
                    <div className={`nav-item flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive 
                        ? 'active text-blue-700 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-80">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                  {currentPageName || 'Dashboard'}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationBell />
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-auto px-2 sm:px-3 flex items-center gap-3 pl-3 border-l border-gray-200 rounded-xl">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-gray-700">
                        {currentUser.full_name?.split(' ')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 mr-4" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{currentUser.full_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link to={createPageUrl("Profile")}>
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="min-h-[calc(100vh-73px)]">
          {children}
        </div>
      </main>
    </div>
  );
}

