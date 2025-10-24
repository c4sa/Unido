
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Save, Plus, Trash2, CheckCircle2, Bell, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import countries from "world-countries";

const REPRESENTATION_TYPES = [
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO" },
  { value: "private_sector", label: "Private Sector" },
  { value: "academic", label: "Academic" },
  { value: "international_org", label: "International Organization" },
  { value: "media", label: "Media" }
];

const PRIORITY_LEVELS = [
  { value: "high", label: "High Priority", color: "bg-red-100 text-red-800" },
  { value: "medium", label: "Medium Priority", color: "bg-orange-100 text-orange-800" },
  { value: "low", label: "Low Priority", color: "bg-blue-100 text-blue-800" }
];

const SAMPLE_TOPICS = [
  "Climate Policy", "Trade Relations", "Digital Governance", "Human Rights",
  "Economic Development", "Security Cooperation", "Health Policy", "Education",
  "Energy Transition", "Migration", "Technology Transfer", "Cultural Exchange"
];

const SAMPLE_REGIONS = [
  "North America", "South America", "Europe", "Africa", "Asia-Pacific",
  "Middle East", "Central Asia", "Caribbean", "Nordic Countries", "ASEAN"
];

// Process countries list: exclude Israel, sort alphabetically, set Saudi Arabia as default
const COUNTRIES_LIST = countries
  .filter(country => country.name.common !== "Israel")
  .map(country => ({
    value: country.name.common,
    label: country.name.common
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const DEFAULT_COUNTRY = "Saudi Arabia";

export default function Profile() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Check if user's country exists in our countries list
      const userCountryExists = user.country && COUNTRIES_LIST.some(c => c.value === user.country);
      
      // Use user's country if it exists in our list, otherwise preserve their existing value or use default
      const userData = {
        ...user,
        country: userCountryExists ? user.country : (user.country || DEFAULT_COUNTRY)
      };
      
      setFormData(userData);
      setConsentGiven(user.consent_given || false);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    setLoading(false);
  };

  // Validation functions
  const validateLinkedInUrl = (url) => {
    if (!url) return true; // Optional field
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
    return linkedinRegex.test(url);
  };

  const validateBiography = (bio) => {
    if (!bio) return false; // Required field
    return bio.trim().length >= 50 && bio.trim().length <= 500;
  };

  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'linkedin_profile':
        if (value && !validateLinkedInUrl(value)) {
          newErrors[field] = 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile)';
        } else {
          delete newErrors[field];
        }
        break;
      case 'biography':
        if (!validateBiography(value)) {
          if (!value || value.trim().length === 0) {
            newErrors[field] = 'Professional biography is required';
          } else if (value.trim().length < 50) {
            newErrors[field] = `Biography must be at least 50 characters (${value.trim().length}/50)`;
          } else if (value.trim().length > 500) {
            newErrors[field] = `Biography must not exceed 500 characters (${value.trim().length}/500)`;
          }
        } else {
          delete newErrors[field];
        }
        break;
      case 'full_name':
      case 'representation_type':
      case 'country':
      case 'job_title':
      case 'organization':
      case 'industry_sector':
        if (!value || value.trim().length === 0) {
          newErrors[field] = 'This field is required';
        } else {
          delete newErrors[field];
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const addInterest = (type, item) => {
    const interests = formData[type] || [];
    if (!interests.find(i => i.topic === item || i.region === item)) {
      const newInterest = type === 'topical_interests'
        ? { topic: item, priority: 'medium' }
        : { region: item, priority: 'medium' };
      setFormData(prev => ({
        ...prev,
        [type]: [...interests, newInterest]
      }));
      
      // Clear error when interest is added
      if (errors[type]) {
        const newErrors = { ...errors };
        delete newErrors[type];
        setErrors(newErrors);
      }
    }
  };

  const removeInterest = (type, index) => {
    const interests = formData[type] || [];
    const newInterests = interests.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [type]: newInterests
    }));
    
    // Show error if all interests are removed
    if (newInterests.length === 0) {
      const newErrors = { ...errors };
      newErrors[type] = type === 'topical_interests' 
        ? 'At least one topical interest is required'
        : 'At least one geographical interest is required';
      setErrors(newErrors);
    }
  };

  const updateInterestPriority = (type, index, priority) => {
    const interests = [...(formData[type] || [])];
    interests[index].priority = priority;
    setFormData(prev => ({ ...prev, [type]: interests }));
  };

  const handleNotificationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value
      }
    }));
  };

  const validateAllFields = () => {
    const newErrors = {};
    
    // Validate required fields
    const requiredFields = [
      { field: 'full_name', label: 'Full Name' },
      { field: 'representation_type', label: 'Representation Type' },
      { field: 'country', label: 'Country/Entity' },
      { field: 'job_title', label: 'Job Title' },
      { field: 'organization', label: 'Organization' },
      { field: 'industry_sector', label: 'Industry Sector' },
      { field: 'biography', label: 'Professional Biography' }
    ];
    
    requiredFields.forEach(({ field, label }) => {
      if (!formData[field] || formData[field].trim().length === 0) {
        newErrors[field] = `${label} is required`;
      }
    });
    
    // Validate biography length
    if (formData.biography && !validateBiography(formData.biography)) {
      if (formData.biography.trim().length < 50) {
        newErrors.biography = `Biography must be at least 50 characters (${formData.biography.trim().length}/50)`;
      } else if (formData.biography.trim().length > 500) {
        newErrors.biography = `Biography must not exceed 500 characters (${formData.biography.trim().length}/500)`;
      }
    }
    
    // Validate LinkedIn URL if provided
    if (formData.linkedin_profile && !validateLinkedInUrl(formData.linkedin_profile)) {
      newErrors.linkedin_profile = 'Please enter a valid LinkedIn profile URL';
    }
    
    // Validate interests
    if (!formData.topical_interests || formData.topical_interests.length === 0) {
      newErrors.topical_interests = 'At least one topical interest is required';
    }
    
    if (!formData.geographical_interests || formData.geographical_interests.length === 0) {
      newErrors.geographical_interests = 'At least one geographical interest is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate all fields before saving
    if (!validateAllFields()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const profileComplete = !!(
        formData.full_name &&
        formData.representation_type &&
        formData.country &&
        formData.job_title &&
        formData.organization &&
        formData.industry_sector &&
        formData.biography &&
        formData.topical_interests?.length > 0 &&
        formData.geographical_interests?.length > 0
      );

      await User.updateMyUserData({
        ...formData,
        consent_given: consentGiven,
        profile_completed: profileComplete
      });

      await loadUserData();
      
      toast({
        title: "Profile Saved",
        description: profileComplete 
          ? "Your profile has been saved and is now complete!" 
          : "Your profile has been saved. Complete all required fields to unlock full platform features.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your profile. Please try again.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultPreferences = {
    new_meeting_request: true,
    request_status_update: true,
    new_message: true,
    booking_confirmed: true
  };
  const preferences = formData.notification_preferences || defaultPreferences;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Profile</h1>
            <p className="text-slate-600 mt-1">Complete your profile to access platform features</p>
          </div>
          {currentUser?.profile_completed && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Profile Complete
            </Badge>
          )}
        </div>

        {/* Consent Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Data Protection & Consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Privacy Notice</h3>
              <p className="text-sm text-blue-800 mb-4">
                By using Unido, your profile information will be visible to other verified users
                to facilitate professional networking. We implement enterprise-grade security measures and
                comply with international data protection standards.
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your data is encrypted and stored securely</li>
                <li>Only verified users can view profiles</li>
                <li>You control your visibility settings</li>
                <li>Data is retained only for platform functionality</li>
              </ul>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={setConsentGiven}
              />
              <Label htmlFor="consent" className="text-sm font-medium">
                I consent to the processing of my data for platform functionality and professional networking
              </Label>
            </div>

            {!consentGiven && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 ml-2">
                  <strong>Required:</strong> Consent is required to save your profile and access platform features.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.full_name || ''}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Enter your full name"
                  className={errors.full_name ? "border-red-500" : ""}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name}</p>
                )}
                <p className="text-xs text-slate-500">Your full name as you'd like it to appear to other users</p>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={currentUser?.email || ''}
                  disabled
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Representation Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.representation_type || ''}
                  onValueChange={(value) => handleInputChange('representation_type', value)}
                >
                  <SelectTrigger className={errors.representation_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select representation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPRESENTATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.representation_type && (
                  <p className="text-sm text-red-500">{errors.representation_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Country/Entity <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.country || DEFAULT_COUNTRY}
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add user's existing country if it's not in the standard list */}
                    {formData.country && !COUNTRIES_LIST.some(c => c.value === formData.country) && (
                      <SelectItem key={formData.country} value={formData.country}>
                        {formData.country} (Current)
                      </SelectItem>
                    )}
                    {COUNTRIES_LIST.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-red-500">{errors.country}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Job Title <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.job_title || ''}
                  onChange={(e) => handleInputChange('job_title', e.target.value)}
                  placeholder="Your current position"
                  className={errors.job_title ? "border-red-500" : ""}
                />
                {errors.job_title && (
                  <p className="text-sm text-red-500">{errors.job_title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Organization <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.organization || ''}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  placeholder="Your organization name"
                  className={errors.organization ? "border-red-500" : ""}
                />
                {errors.organization && (
                  <p className="text-sm text-red-500">{errors.organization}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Industry Sector <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.industry_sector || ''}
                  onChange={(e) => handleInputChange('industry_sector', e.target.value)}
                  placeholder="e.g. Public Policy, Trade, Defense"
                  className={errors.industry_sector ? "border-red-500" : ""}
                />
                {errors.industry_sector && (
                  <p className="text-sm text-red-500">{errors.industry_sector}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>LinkedIn Profile (Optional)</Label>
                <Input
                  value={formData.linkedin_profile || ''}
                  onChange={(e) => handleInputChange('linkedin_profile', e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className={errors.linkedin_profile ? "border-red-500" : ""}
                />
                {errors.linkedin_profile && (
                  <p className="text-sm text-red-500">{errors.linkedin_profile}</p>
                )}
                <p className="text-xs text-slate-500">Enter your full LinkedIn profile URL</p>
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <Label>Professional Biography <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.biography || ''}
                onChange={(e) => handleInputChange('biography', e.target.value)}
                placeholder="Brief description of your professional background and expertise..."
                className={`h-24 ${errors.biography ? "border-red-500" : ""}`}
              />
              <div className="flex justify-between items-center">
                <div>
                  {errors.biography && (
                    <p className="text-sm text-red-500">{errors.biography}</p>
                  )}
                  {!errors.biography && (
                    <p className="text-xs text-slate-500">Minimum 50 characters, maximum 500 characters</p>
                  )}
                </div>
                <p className={`text-xs ${
                  (formData.biography?.length || 0) < 50 
                    ? 'text-red-500' 
                    : (formData.biography?.length || 0) > 500 
                      ? 'text-red-500' 
                      : 'text-slate-500'
                }`}>
                  {formData.biography?.length || 0}/500
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topical Interests */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Topical Interests <span className="text-red-500">*</span></CardTitle>
            <p className="text-sm text-slate-600">Select areas of professional interest with priority levels</p>
            {errors.topical_interests && (
              <p className="text-sm text-red-500">{errors.topical_interests}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TOPICS.map((topic) => (
                  <Button
                    key={topic}
                    variant="outline"
                    size="sm"
                    onClick={() => addInterest('topical_interests', topic)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {topic}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                {(formData.topical_interests || []).map((interest, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">{interest.topic}</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={interest.priority}
                        onValueChange={(value) => updateInterestPriority('topical_interests', index, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInterest('topical_interests', index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geographical Interests */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Geographical Interests <span className="text-red-500">*</span></CardTitle>
            <p className="text-sm text-slate-600">Select regions of professional focus</p>
            {errors.geographical_interests && (
              <p className="text-sm text-red-500">{errors.geographical_interests}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SAMPLE_REGIONS.map((region) => (
                  <Button
                    key={region}
                    variant="outline"
                    size="sm"
                    onClick={() => addInterest('geographical_interests', region)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {region}
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                {(formData.geographical_interests || []).map((interest, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">{interest.region}</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={interest.priority}
                        onValueChange={(value) => updateInterestPriority('geographical_interests', index, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInterest('geographical_interests', index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Notification Preferences
            </CardTitle>
            <p className="text-sm text-slate-600">Choose which platform notifications you want to receive</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="notif-meeting-request" className="font-medium">New Meeting Request</Label>
                <p className="text-sm text-slate-600">Notify me when a user sends me a meeting request</p>
              </div>
              <Switch
                id="notif-meeting-request"
                checked={preferences.new_meeting_request}
                onCheckedChange={(checked) => handleNotificationChange('new_meeting_request', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="notif-status-update" className="font-medium">Request Status Update</Label>
                <p className="text-sm text-slate-600">Notify me when a user accepts or declines my request</p>
              </div>
              <Switch
                id="notif-status-update"
                checked={preferences.request_status_update}
                onCheckedChange={(checked) => handleNotificationChange('request_status_update', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="notif-new-message" className="font-medium">New Chat Message</Label>
                <p className="text-sm text-slate-600">Notify me when I receive a new chat message</p>
              </div>
              <Switch
                id="notif-new-message"
                checked={preferences.new_message}
                onCheckedChange={(checked) => handleNotificationChange('new_message', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="notif-booking" className="font-medium">Booking Confirmation</Label>
                <p className="text-sm text-slate-600">Notify me when a venue is booked for my meeting</p>
              </div>
              <Switch
                id="notif-booking"
                checked={preferences.booking_confirmed}
                onCheckedChange={(checked) => handleNotificationChange('booking_confirmed', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Preferences */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Privacy Preferences
            </CardTitle>
            <p className="text-sm text-slate-600">Control how your profile appears to other users</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="hide-profile" className="font-medium">Hide Profile from Directory</Label>
                <p className="text-sm text-slate-600">Make your profile invisible to other users in the directory search</p>
              </div>
              <Switch
                id="hide-profile"
                checked={formData.is_profile_hidden || false}
                onCheckedChange={(checked) => handleInputChange('is_profile_hidden', checked)}
              />
            </div>
            {formData.is_profile_hidden && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 ml-2">
                  <strong>Note:</strong> While your profile is hidden, you can still send meeting requests to others and receive requests if someone has your direct information.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !consentGiven}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
