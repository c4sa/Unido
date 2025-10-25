import React from 'react';
import { Shield, Lock, Eye, Database, Mail, Users, Calendar, MessageSquare, Building, Bell, Smartphone, Globe } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-lg text-gray-600">
            How we collect, use, and protect your information on Uni Connect
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-6 w-6 text-blue-600 mr-2" />
              Introduction
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Uni Connect ("we," "our," or "us") is committed to protecting your privacy and personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
                our networking platform designed for diplomatic conferences and international meetings.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                By using our platform, you consent to the data practices described in this policy. If you do not agree 
                with the practices described in this policy, please do not use our services.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                  <Users className="h-5 w-5 text-green-600 mr-2" />
                  Personal Information
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Account Information:</strong> Email address, full name, and password</li>
                  <li><strong>Profile Information:</strong> Job title, organization, country, representation type, industry sector</li>
                  <li><strong>Professional Details:</strong> Biography, LinkedIn profile, topical interests, geographical interests</li>
                  <li><strong>Contact Information:</strong> Email address for communications and notifications</li>
                  <li><strong>Role Information:</strong> User role (delegate or admin) for access control</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                  <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                  Meeting and Connection Data
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Meeting Requests:</strong> Meeting details, participants, topics, and status</li>
                  <li><strong>Connection Requests:</strong> Delegate connections and relationship status</li>
                  <li><strong>Venue Bookings:</strong> Room reservations, meeting schedules, and venue preferences</li>
                  <li><strong>Meeting History:</strong> Past meetings, participants, and outcomes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                  <MessageSquare className="h-5 w-5 text-orange-600 mr-2" />
                  Communication Data
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Chat Messages:</strong> Direct messages between meeting participants</li>
                  <li><strong>Connection Messages:</strong> Messages sent with connection requests</li>
                  <li><strong>Meeting Communications:</strong> Messages related to meeting coordination</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                  <Bell className="h-5 w-5 text-red-600 mr-2" />
                  Usage and Technical Data
                </h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Platform Usage:</strong> Features used, pages visited, and time spent on platform</li>
                  <li><strong>Device Information:</strong> Device type, browser, operating system, and IP address</li>
                  <li><strong>Log Data:</strong> Server logs, error reports, and performance metrics</li>
                  <li><strong>Notification Preferences:</strong> Your communication and alert preferences</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="h-6 w-6 text-blue-600 mr-2" />
              How We Use Your Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Core Platform Functions</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Facilitate delegate connections and networking</li>
                  <li>Enable meeting requests and coordination</li>
                  <li>Provide secure messaging between participants</li>
                  <li>Manage venue bookings and scheduling</li>
                  <li>Send notifications about platform activities</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Service Improvement</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Analyze usage patterns to improve platform features</li>
                  <li>Monitor system performance and reliability</li>
                  <li>Develop new features based on user needs</li>
                  <li>Ensure platform security and prevent abuse</li>
                  <li>Provide customer support and assistance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-6 w-6 text-blue-600 mr-2" />
              Information Sharing and Disclosure
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-2">We DO NOT sell your personal information</h3>
                <p className="text-blue-800">
                  We do not sell, trade, or rent your personal information to third parties for marketing purposes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Limited Sharing Scenarios</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li><strong>With Other Users:</strong> Your profile information is visible to other delegates as part of the networking platform</li>
                  <li><strong>Meeting Participants:</strong> Your information is shared with other participants in meetings you join</li>
                  <li><strong>Service Providers:</strong> We may share data with trusted third-party services (Supabase, Vercel) that help us operate the platform</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our rights and safety</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, user data may be transferred as part of the business assets</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="h-6 w-6 text-blue-600 mr-2" />
              Data Security and Protection
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Safeguards</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>HTTPS encryption for all data transmission</li>
                  <li>Row-Level Security (RLS) policies on all database tables</li>
                  <li>Secure authentication with Supabase Auth</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Automated backups with point-in-time recovery</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Operational Safeguards</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Access controls and role-based permissions</li>
                  <li>Regular security audits and assessments</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response procedures</li>
                  <li>Compliance with industry security standards</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="h-6 w-6 text-blue-600 mr-2" />
              Third-Party Services
            </h2>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                We use the following third-party services to operate our platform:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Supabase</h3>
                  <p className="text-sm text-gray-600">
                    Database and authentication services. 
                    <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Vercel</h3>
                  <p className="text-sm text-gray-600">
                    Hosting and deployment platform.
                    <a href="https://vercel.com/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile App */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Smartphone className="h-6 w-6 text-blue-600 mr-2" />
              Mobile Application
            </h2>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                Our mobile application (React Native/Flutter) collects and uses the same information as our web platform, 
                with additional mobile-specific features:
              </p>
              
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Push Notifications:</strong> We may send push notifications for meeting updates and platform activities</li>
                <li><strong>Device Information:</strong> Device type, operating system, and app version for technical support</li>
                <li><strong>Location Services:</strong> Optional location access for venue directions and local features</li>
                <li><strong>Camera Access:</strong> Optional camera access for profile photo capture</li>
                <li><strong>Biometric Authentication:</strong> Optional fingerprint or face ID for secure login</li>
              </ul>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Database className="h-6 w-6 text-blue-600 mr-2" />
              Data Retention and Deletion
            </h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Retention Periods</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li><strong>User Accounts:</strong> Retained until account deletion or 2 years of inactivity</li>
                  <li><strong>Meeting Data:</strong> Retained for 1 year after meeting completion</li>
                  <li><strong>Chat Messages:</strong> Retained for 6 months after last message</li>
                  <li><strong>Notifications:</strong> Auto-deleted after 90 days if read</li>
                  <li><strong>System Logs:</strong> Retained for 1 year for security and debugging purposes</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your Rights</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete personal data</li>
                  <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal obligations)</li>
                  <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li><strong>Restriction:</strong> Limit how we process your personal data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* GDPR Compliance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-6 w-6 text-blue-600 mr-2" />
              GDPR Compliance
            </h2>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                We are committed to complying with the General Data Protection Regulation (GDPR) and other applicable 
                privacy laws. Our platform includes:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Consent Management</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Explicit consent required before data processing</li>
                    <li>Clear privacy notices explaining data usage</li>
                    <li>Consent tracking in database (consent_given field)</li>
                    <li>Ability to withdraw consent at any time</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Data Protection</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Data minimization - only collect necessary data</li>
                    <li>Purpose limitation - use data only for stated purposes</li>
                    <li>Storage limitation - retain data only as long as necessary</li>
                    <li>Privacy by design - built-in privacy protections</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-800">
                Our platform is designed for professional diplomatic and international meetings. We do not knowingly 
                collect personal information from children under 18 years of age. If we become aware that we have 
                collected personal information from a child under 18, we will take steps to delete such information.
              </p>
            </div>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
            <p className="text-gray-700">
              Our platform is hosted on servers located in various regions. When you use our services, your data may 
              be transferred to and processed in countries other than your own. We ensure that such transfers comply 
              with applicable data protection laws and implement appropriate safeguards to protect your information.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. 
              We will notify you of any material changes by posting the updated policy on our platform and updating the 
              "Last updated" date. Your continued use of our services after such changes constitutes acceptance of the 
              updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Mail className="h-6 w-6 text-blue-600 mr-2" />
              Contact Us
            </h2>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> ai@c4.sa
                </p>
                <p className="text-gray-700">
                  <strong>Platform:</strong> Contact us through the admin panel or support system
                </p>
                <p className="text-gray-700">
                  <strong>Data Protection Officer:</strong> ai@c4.sa
                </p>
              </div>
              
              <p className="text-sm text-gray-600 mt-4">
                We will respond to your inquiries within 30 days of receipt.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
