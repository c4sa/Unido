import React, { useState, useEffect } from 'react';
import { Notification, supabase } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        // Not logged in
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      const fetched = await Notification.filter(
        { user_id: currentUser.id },
        '-created_date',
        20
      );
      setNotifications(fetched);
    };

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add new notification to the list
            setNotifications(prev => [payload.new, ...prev].slice(0, 20));
          } else if (payload.eventType === 'UPDATE') {
            // Update existing notification
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted notification
            setNotifications(prev =>
              prev.filter(n => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleMarkAsRead = async (id) => {
    await Notification.update(id, { is_read: true });
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    await Promise.all(
      unreadIds.map((id) => Notification.update(id, { is_read: true }))
    );
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 rounded-xl">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 mr-4 glass-card border-0 shadow-xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <CheckCheck className="w-4 h-4 mr-2" /> 
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Link
                to={notification.link || '#'}
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                className="block"
              >
                <div className={`p-4 border-b border-gray-50 hover:bg-gray-25 transition-colors ${
                  !notification.is_read ? 'bg-blue-25' : 'bg-white'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      !notification.is_read ? 'bg-blue-500' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 leading-snug">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 leading-snug">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {formatDistanceToNow(new Date(notification.created_date), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">You'll see updates here when they arrive</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}