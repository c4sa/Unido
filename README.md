# 🌐 Diplomat Connect

A professional networking platform for diplomats, government officials, and international delegates to connect, schedule meetings, and collaborate.

## ✨ Features

- 🔐 **Secure Authentication** - Google OAuth + Email/Password
- 👥 **User Profiles** - Comprehensive professional profiles with interests and expertise
- 📅 **Meeting Management** - Request, accept, and schedule meetings
- 💬 **Real-time Chat** - Direct messaging between meeting participants
- 🏢 **Venue Booking** - Reserve conference rooms and meeting spaces
- 🔔 **Live Notifications** - Instant real-time updates
- 🛡️ **Admin Dashboard** - Manage users, rooms, and bookings
- 🔒 **Privacy Controls** - Profile visibility settings and consent management
- 📊 **Analytics** - Usage statistics and insights

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Real-time)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Google OAuth + Email/Password)
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: Supabase Real-time subscriptions

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up here](https://supabase.com))
- Google Cloud Console account (for OAuth)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd diplomat-connect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

Follow the detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):

1. Create a Supabase project
2. Run the database schema (`supabase-schema.sql`)
3. Configure Google OAuth (primary method)
4. Enable Email/Password authentication (optional enhancement)
5. Get your API credentials

### 4. Configure Environment Variables

```bash
# Copy the template
cp env.template .env

# Edit .env and add your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📚 Documentation

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Comprehensive Supabase configuration guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guide for migrating from base44 to Supabase
- **[supabase-schema.sql](./supabase-schema.sql)** - Database schema and RLS policies
- **[Documentations/](./Documentations/)** - Detailed feature documentation

## 🏗️ Project Structure

```
diplomat-connect/
├── src/
│   ├── api/
│   │   ├── supabaseClient.js    # Supabase client configuration
│   │   └── entities.js           # Database entity wrappers
│   ├── components/
│   │   ├── ui/                   # Reusable UI components (shadcn/ui)
│   │   ├── notifications/        # Notification components
│   │   ├── meetings/             # Meeting-related components
│   │   └── venues/               # Venue booking components
│   ├── pages/
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   ├── Delegates.jsx         # Browse users
│   │   ├── Meetings.jsx          # Meeting management
│   │   ├── Chat.jsx              # Real-time messaging
│   │   ├── Profile.jsx           # User profile
│   │   ├── Venues.jsx            # Venue schedule
│   │   ├── Rooms.jsx             # Room management (admin)
│   │   ├── Schedule.jsx          # Personal schedule
│   │   └── Admin.jsx             # Admin dashboard
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   └── main.jsx                  # Application entry point
├── scripts/
│   ├── export-base44-data.js     # Data export script
│   └── import-to-supabase.js     # Data import script
├── supabase-schema.sql           # Database schema
└── Documentations/               # Feature documentation
```

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Export data from base44 (if migrating)
npm run migrate:export

# Import data to Supabase (if migrating)
npm run migrate:import
```

### Code Style

- ESLint configuration included
- Follow React best practices
- Use functional components with hooks
- Maintain consistent naming conventions

## 🗄️ Database Schema

The application uses the following main tables:

- **users** - User profiles and preferences
- **meeting_requests** - Meeting requests and status
- **chat_messages** - Direct messages between users
- **venue_rooms** - Available meeting rooms
- **venue_bookings** - Room reservations
- **notifications** - User notifications

See [supabase-schema.sql](./supabase-schema.sql) for complete schema and RLS policies.

## 🔒 Security

- **Row Level Security (RLS)** - Enforced on all tables
- **Google OAuth** - Secure authentication
- **Encrypted Communication** - All data transmitted over HTTPS
- **Session Management** - Automatic token refresh
- **Privacy Controls** - User-configurable profile visibility

## 📱 Features Overview

### For Users

- **Profile Management**: Complete professional profiles with interests
- **Browse Delegates**: Search and filter users by country, organization, interests
- **Meeting Requests**: Send and receive meeting invitations
- **Real-time Chat**: Instant messaging with meeting participants
- **Venue Booking**: Reserve rooms for confirmed meetings
- **Schedule View**: See upcoming meetings and bookings
- **Notifications**: Real-time alerts for all activities
- **Privacy Settings**: Control profile visibility

### For Admins

- **User Management**: View and edit all user profiles
- **Room Management**: Create, edit, and deactivate venues
- **Private Bookings**: Reserve rooms for special events
- **Analytics**: Usage statistics and insights
- **Booking Management**: View and manage all reservations

## 🌐 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Other Platforms

The app can be deployed to any static hosting service:

1. Build the app: `npm run build`
2. Deploy the `dist/` folder
3. Configure environment variables
4. Update OAuth redirect URLs

## 🧪 Testing

### Manual Testing Checklist

- [ ] Authentication (Google OAuth)
- [ ] Profile creation and editing
- [ ] Browse delegates
- [ ] Send meeting request
- [ ] Accept/decline meeting request
- [ ] Chat messaging
- [ ] Venue booking
- [ ] Real-time notifications
- [ ] Admin functions

### Testing Real-time Features

Open the app in two browsers:
1. Send a message in browser 1
2. It should appear instantly in browser 2
3. Test notifications similarly

## 🐛 Troubleshooting

### Common Issues

**Cannot connect to Supabase**
- Check `.env` file exists and has correct values
- Restart dev server after creating `.env`
- Verify Supabase project is active

**Authentication fails**
- Verify Google OAuth is configured in Supabase
- Check redirect URLs match exactly
- Clear browser cookies and try again

**RLS permission errors**
- Ensure you're authenticated
- Check RLS policies are created
- Verify user profile exists in `public.users`

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed troubleshooting.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for diplomatic use.

## 🆘 Support

For issues and questions:
- Check the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) if migrating
- Check [Supabase documentation](https://supabase.com/docs)

## 🎉 Acknowledgments

- Built with [Supabase](https://supabase.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

---

**Made with ❤️ for global diplomacy**
