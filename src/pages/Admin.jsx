
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
// Removed integrations related to email sending and file upload, as per new user creation flow
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Removed Tabs imports, as invitation functionality is replaced by a static info card
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Building2,
  Globe,
  Edit,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import { format } from "date-fns";

const REPRESENTATION_TYPES = [
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO" },
  { value: "private_sector", label: "Private Sector" },
  { value: "academic", label: "Academic" },
  { value: "international_org", label: "International Organization" },
  { value: "media", label: "Media" }
];

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allDelegates, setAllDelegates] = useState([]); 
  // Removed invitation-related states: inviteForm, bulkInvites, inviteFile, processingFile, fileFeedback, sending, addDelegateForm, isAddDialogOpen
  const [loading, setLoading] = useState(true);
  const [selectedDelegate, setSelectedDelegate] = useState(null); // This state is present in the original code but not explicitly used in the provided outline's logic. Keeping it for full fidelity to existing structure.
  const [editingDelegate, setEditingDelegate] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    role: 'user'
  });
  const [creating, setCreating] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (user.role !== 'admin') {
        return;
      }

      const delegates = await User.list('-created_date');
      setAllDelegates(delegates);

    } catch (error) {
      console.error("Error loading admin data:", error);
    }
    setLoading(false);
  };

  const handleEditDelegate = (delegate) => {
    setEditingDelegate(delegate);
    setEditForm({
      full_name: delegate.full_name || '',
      organization: delegate.organization || '',
      country: delegate.country || '',
      job_title: delegate.job_title || '',
      representation_type: delegate.representation_type || '',
      industry_sector: delegate.industry_sector || '',
      biography: delegate.biography || '',
      linkedin_profile: delegate.linkedin_profile || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDelegate) return;

    // Removed setSending(true)
    try {
      await User.update(editingDelegate.id, editForm);
      
      setEditingDelegate(null);
      setEditForm({});
      setIsEditDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error updating delegate:", error);
    }
    // Removed setSending(false)
  };

  // Removed invitation-related functions: sendInviteEmail, handleSingleInvite, handleBulkInvites, downloadTemplate, handleFileChange, handleBulkInviteFromFile, handleAddDelegate

  const updateDelegateRole = async (delegateId, newRole) => {
    try {
      await User.update(delegateId, { role: newRole });
      await loadData();
    } catch (error) {
      console.error("Error updating delegate role:", error);
    }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.email || !createUserForm.role) {
      return;
    }

    setCreating(true);
    try {
      // Call backend API to create user
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/create-user'
        : '/api/create-user';
        
      console.log('Calling API:', apiUrl);
      console.log('Request body:', createUserForm);
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserForm)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. Please ensure the development server is running on port 3000.`);
      }

      const result = await response.json();
      console.log('Response result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Reset form and close dialog
      setCreateUserForm({ email: '', role: 'user' });
      setIsCreateUserDialogOpen(false);
      
      // Reload data to show new user
      await loadData();
      
      // Show success message
      alert('User created successfully! Credentials have been sent to their email.');
    } catch (error) {
      console.error("Error creating user:", error);
      alert(error.message || 'Failed to create user. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const csvContent = 'email,role\nuser1@example.com,user\nuser2@example.com,admin\nuser3@example.com,user';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'user-bulk-upload-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
      }
      setBulkFile(file);
      setBulkResults(null);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIndex = headers.indexOf('email');
    const roleIndex = headers.indexOf('role');

    if (emailIndex === -1 || roleIndex === -1) {
      throw new Error('CSV file must have "email" and "role" columns');
    }

    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values[emailIndex] && values[roleIndex]) {
        users.push({
          email: values[emailIndex],
          role: values[roleIndex]
        });
      }
    }

    return users;
  };

  const handleBulkCreate = async () => {
    if (!bulkFile) {
      alert('Please select a CSV file');
      return;
    }

    setProcessingBulk(true);
    setBulkResults(null);

    try {
      // Read file
      const text = await bulkFile.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        throw new Error('No valid users found in CSV file');
      }

      // Call backend API to create users
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/bulk-create-users'
        : '/api/bulk-create-users';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users })
      });

      // Check if response is HTML (404 page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. Please ensure the development server is running on port 3000.`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create users');
      }

      setBulkResults(result);
      
      // Reload data to show new users
      await loadData();
      
    } catch (error) {
      console.error("Error creating bulk users:", error);
      alert(error.message || 'Failed to create users. Please check the CSV format and try again.');
    } finally {
      setProcessingBulk(false);
    }
  };

  const getStatusColor = (delegate) => {
    if (!delegate.consent_given) return 'bg-red-100 text-red-800';
    if (!delegate.profile_completed) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (delegate) => {
    if (!delegate.consent_given) return 'Pending Consent';
    if (!delegate.profile_completed) return 'Profile Incomplete';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Access Denied:</strong> This page is restricted to administrators only.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const activeCount = allDelegates.filter(d => d.consent_given && d.profile_completed).length;
  const pendingCount = allDelegates.filter(d => !d.consent_given || !d.profile_completed).length;
  const adminCount = allDelegates.filter(d => d.role === 'admin').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Administration Panel</h1>
            <p className="text-slate-600 mt-1">Manage users and platform settings</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">Admin Access</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{allDelegates.length}</div>
              <p className="text-xs text-slate-500 mt-2">Registered users</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{activeCount}</div>
              <p className="text-xs text-slate-500 mt-2">Fully configured</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Setup</CardTitle>
              <Clock className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{pendingCount}</div>
              <p className="text-xs text-slate-500 mt-2">Incomplete profiles</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Administrators</CardTitle>
              <Shield className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{adminCount}</div>
              <p className="text-xs text-slate-500 mt-2">Admin users</p>
            </CardContent>
          </Card>
        </div>


        {/* User Management */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>User Management</CardTitle>
                <p className="text-sm text-slate-600">View and manage all registered users</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
                <Button
                  onClick={() => setIsBulkCreateDialogOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Create Bulk User
                </Button>
                <Button
                  onClick={() => setIsCreateUserDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create User
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allDelegates.map((delegate) => (
                <div key={delegate.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {delegate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {delegate.full_name || 'Unnamed User'}
                        </h3>
                        <Badge variant={delegate.role === 'admin' ? 'default' : 'outline'}>
                          {delegate.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{delegate.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {delegate.organization && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Building2 className="w-3 h-3" />
                            <span>{delegate.organization}</span>
                          </div>
                        )}
                        {delegate.country && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Globe className="w-3 h-3" />
                            <span>{delegate.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(delegate)}>
                      {getStatusText(delegate)}
                    </Badge>
                    <p className="text-xs text-slate-500">
                      Joined {format(new Date(delegate.created_date), 'MMM d, yyyy')}
                    </p>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDelegate(delegate)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    
                    {delegate.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDelegateRole(delegate.id, 'admin')}
                        className="text-xs"
                      >
                        Make Admin
                      </Button>
                    )}
                    
                    {delegate.role === 'admin' && delegate.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDelegateRole(delegate.id, 'user')}
                        className="text-xs"
                      >
                        Remove Admin
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {allDelegates.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No users yet</h3>
                <p className="text-slate-600">Users will appear here once they sign in with Google</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Delegate Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
            </DialogHeader>
            <Alert className="border-blue-200 bg-blue-50 mt-4">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Password Management:</strong> This platform uses Google for authentication. Users must manage their passwords through their Google account settings, as no passwords are stored in this application.
              </AlertDescription>
            </Alert>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-job-title">Job Title</Label>
                  <Input
                    id="edit-job-title"
                    value={editForm.job_title || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Job title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-organization">Organization</Label>
                  <Input
                    id="edit-organization"
                    value={editForm.organization || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="Organization"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-country">Country/Entity</Label>
                  <Input
                    id="edit-country"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-representation">Representation Type</Label>
                  <Select 
                    value={editForm.representation_type || ''} 
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, representation_type: value }))}
                  >
                    <SelectTrigger id="edit-representation">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPRESENTATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sector">Industry Sector</Label>
                  <Input
                    id="edit-sector"
                    value={editForm.industry_sector || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, industry_sector: e.target.value }))}
                    placeholder="Industry sector"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-linkedin">LinkedIn Profile</Label>
                <Input
                  id="edit-linkedin"
                  value={editForm.linkedin_profile || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, linkedin_profile: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">Biography</Label>
                <Textarea
                  id="edit-bio"
                  value={editForm.biography || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, biography: e.target.value }))}
                  placeholder="Professional biography..."
                  className="h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDelegate(null);
                  setEditForm({});
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account. A temporary password will be generated and sent to the user's email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email Address</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select 
                  value={createUserForm.role} 
                  onValueChange={(value) => setCreateUserForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Note:</strong> A temporary password will be generated and sent to the user's email. 
                  The user will be required to reset their password on first login.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateUserDialogOpen(false);
                  setCreateUserForm({ email: '', role: 'user' });
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={creating || !createUserForm.email || !createUserForm.role}
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Create User Dialog */}
        <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bulk Users</DialogTitle>
              <DialogDescription>
                Upload a CSV file to create multiple users at once. Download the template to see the required format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>CSV Format:</strong> The file must have "email" and "role" columns. 
                  Role must be either "user" or "admin". Download the template for an example.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="bulk-file">CSV File</Label>
                <Input
                  id="bulk-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={processingBulk}
                />
                {bulkFile && (
                  <p className="text-sm text-slate-600">
                    Selected: {bulkFile.name}
                  </p>
                )}
              </div>

              {bulkResults && (
                <div className="space-y-2">
                  <Alert className={bulkResults.failed > 0 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
                    <AlertCircle className={`h-4 w-4 ${bulkResults.failed > 0 ? "text-orange-600" : "text-green-600"}`} />
                    <AlertDescription className={bulkResults.failed > 0 ? "text-orange-800" : "text-green-800"}>
                      <strong>Results:</strong> {bulkResults.created} users created successfully, {bulkResults.failed} failed out of {bulkResults.total} total.
                    </AlertDescription>
                  </Alert>
                  
                  {bulkResults.results.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-red-600 mb-2">Errors:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {bulkResults.results.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-red-600">
                            {error.email}: {error.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                disabled={processingBulk}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsBulkCreateDialogOpen(false);
                  setBulkFile(null);
                  setBulkResults(null);
                }}
                disabled={processingBulk}
              >
                {bulkResults ? 'Close' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleBulkCreate}
                disabled={processingBulk || !bulkFile}
              >
                {processingBulk ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Create Users'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
