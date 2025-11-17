import React, { useState, useEffect } from "react";
import { Exhibitor } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Store,
  Search,
  Filter,
  Building2,
  Globe,
  ExternalLink,
  Package,
  MapPin,
  X,
  Award,
  CheckCircle2,
  Link as LinkIcon
} from "lucide-react";

export default function Exhibitors() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exhibitors, setExhibitors] = useState([]);
  const [filteredExhibitors, setFilteredExhibitors] = useState([]);
  const [selectedExhibitor, setSelectedExhibitor] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  useEffect(() => {
    loadExhibitors();
  }, []);

  useEffect(() => {
    filterExhibitors();
  }, [exhibitors, searchTerm, statusFilter]);

  const loadExhibitors = async () => {
    try {
      setLoading(true);
      const exhibitorsData = await Exhibitor.list('-created_date');
      setExhibitors(exhibitorsData || []);
    } catch (error) {
      console.error("Error loading exhibitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterExhibitors = () => {
    let filtered = [...exhibitors];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(exhibitor =>
        exhibitor.name?.toLowerCase().includes(searchLower) ||
        exhibitor.description?.toLowerCase().includes(searchLower) ||
        exhibitor.booth_number?.toLowerCase().includes(searchLower) ||
        exhibitor.website?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exhibitor => {
        if (statusFilter === 'active') {
          return exhibitor.is_active === true;
        } else if (statusFilter === 'inactive') {
          return exhibitor.is_active === false;
        }
        return true;
      });
    }

    setFilteredExhibitors(filtered);
  };

  const formatWebsiteUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-96 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exhibitors</h1>
            <p className="text-slate-600 mt-1">Discover and explore exhibitors and their offerings</p>
          </div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">{filteredExhibitors.length} exhibitor{filteredExhibitors.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search exhibitors by name, description, booth number, or website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Exhibitors</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exhibitors Grid */}
        {filteredExhibitors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExhibitors.map((exhibitor) => {
              return (
                <Card
                  key={exhibitor.id}
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedExhibitor(exhibitor)}
                >
                  {/* Logo/Image Section */}
                  <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500">
                    {exhibitor.logo_url ? (
                      <img
                        src={exhibitor.logo_url}
                        alt={exhibitor.name}
                        className="w-full h-full object-contain p-4 bg-white group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 ${exhibitor.logo_url ? 'hidden' : 'flex'}`}
                    >
                      <Store className="w-16 h-16 text-white/30" />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${exhibitor.is_active ? 'bg-green-500' : 'bg-gray-500'} text-white border-0`}>
                        {exhibitor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Sponsorship Tier Badge */}
                    {exhibitor.sponsorship_tier && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-yellow-500 text-white border-0 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {exhibitor.sponsorship_tier}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2 min-h-[3rem]">
                      {exhibitor.name || 'Untitled Exhibitor'}
                    </CardTitle>
                    {exhibitor.booth_number && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>Booth {exhibitor.booth_number}</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {exhibitor.description && (
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {exhibitor.description}
                      </p>
                    )}

                    {exhibitor.website && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <LinkIcon className="w-4 h-4" />
                        <span className="truncate">{exhibitor.website}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full group-hover:bg-indigo-50 group-hover:border-indigo-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExhibitor(exhibitor);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No exhibitors found</h3>
              <p className="text-slate-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Exhibitors will appear here when they are added to the platform'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Exhibitor Detail Dialog */}
        {selectedExhibitor && (
          <Dialog open={!!selectedExhibitor} onOpenChange={(open) => !open && setSelectedExhibitor(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedExhibitor.name || 'Untitled Exhibitor'}</DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedExhibitor.booth_number && `Booth ${selectedExhibitor.booth_number}`}
                    </DialogDescription>
                  </div>
                  <button
                    onClick={() => setSelectedExhibitor(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Logo/Image */}
                {selectedExhibitor.logo_url && (
                  <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500">
                    <img
                      src={selectedExhibitor.logo_url}
                      alt={selectedExhibitor.name}
                      className="w-full h-full object-contain p-8 bg-white"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 hidden">
                      <Store className="w-24 h-24 text-white/30" />
                    </div>
                  </div>
                )}

                {/* Exhibitor Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedExhibitor.booth_number && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Booth Number</p>
                        <p className="text-sm text-slate-600 font-semibold">{selectedExhibitor.booth_number}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Status</p>
                      <p className="text-sm text-slate-600">
                        {selectedExhibitor.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  {selectedExhibitor.sponsorship_tier && (
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                      <Award className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Sponsorship Tier</p>
                        <p className="text-sm text-slate-600 capitalize">{selectedExhibitor.sponsorship_tier}</p>
                      </div>
                    </div>
                  )}

                  {selectedExhibitor.website && (
                    <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Website</p>
                        <a
                          href={formatWebsiteUrl(selectedExhibitor.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          {selectedExhibitor.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedExhibitor.description && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedExhibitor.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedExhibitor.website && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(formatWebsiteUrl(selectedExhibitor.website), '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedExhibitor(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
