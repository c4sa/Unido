import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const ALL_EQUIPMENT = ["Wifi", "Projector", "Monitor", "Coffee", "Whiteboard"];

export default function RoomFormDialog({ room, onSave, children }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'small',
        capacity: 4,
        floor: 1,
        location: '',
        contact: '',
        description: '',
        equipment: [],
    });
    const [saving, setSaving] = useState(false);

    // Initialize form data when dialog opens or room changes
    useEffect(() => {
        if (open) {
            if (room) {
                console.log("Editing room:", room); // Debug log
                setFormData({
                    name: room.name || '',
                    type: room.type || 'small',
                    capacity: room.capacity || 4,
                    floor: room.floor || 1,
                    location: room.location || '',
                    contact: room.contact || '',
                    description: room.description || '',
                    equipment: room.equipment || [],
                });
            } else {
                console.log("Adding new room"); // Debug log
                setFormData({
                    name: '',
                    type: 'small',
                    capacity: 4,
                    floor: 1,
                    location: '',
                    contact: '',
                    description: '',
                    equipment: [],
                });
            }
        }
    }, [room, open]);

    const handleEquipmentChange = (item) => {
        setFormData(prev => {
            const equipment = prev.equipment.includes(item)
                ? prev.equipment.filter(e => e !== item)
                : [...prev.equipment, item];
            return { ...prev, equipment };
        });
    };

    const handleSaveClick = async () => {
        if (!formData.name.trim() || !formData.capacity || !formData.floor) {
            console.log("Validation failed:", formData);
            return;
        }
        
        setSaving(true);
        try {
            const dataToSave = room ? { ...room, ...formData } : formData;
            console.log("Saving room data:", dataToSave); // Debug log
            await onSave(dataToSave);
            setOpen(false);
        } catch (error) {
            console.error("Error saving room:", error);
        }
        setSaving(false);
    };

    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
            // Reset form when closing
            setFormData({
                name: '',
                type: 'small',
                capacity: 4,
                floor: 1,
                location: '',
                contact: '',
                description: '',
                equipment: [],
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{room ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                    <DialogDescription>
                        {room ? 'Update the details for this meeting room.' : 'Fill out the details for the new meeting room.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-96 overflow-y-auto">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-gray-900">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Room Name *</Label>
                                <Input 
                                    id="name" 
                                    value={formData.name} 
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
                                    placeholder="e.g. Alpine Conference Room"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={formData.type} onValueChange={(val) => setFormData(p => ({ ...p, type: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Small</SelectItem>
                                        <SelectItem value="large">Large</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity *</Label>
                                <Input 
                                    id="capacity" 
                                    type="number" 
                                    value={formData.capacity} 
                                    onChange={(e) => setFormData(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} 
                                    min="1"
                                    placeholder="4"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="floor">Floor *</Label>
                                <Input 
                                    id="floor" 
                                    type="number" 
                                    value={formData.floor} 
                                    onChange={(e) => setFormData(p => ({ ...p, floor: parseInt(e.target.value) || 0 }))} 
                                    min="0"
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input 
                                    id="location" 
                                    value={formData.location} 
                                    onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} 
                                    placeholder="e.g. East Wing"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact & Description */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-gray-900">Additional Information</h3>
                        <div className="space-y-2">
                            <Label htmlFor="contact">Contact Person/Department</Label>
                            <Input 
                                id="contact" 
                                value={formData.contact} 
                                onChange={(e) => setFormData(p => ({ ...p, contact: e.target.value }))} 
                                placeholder="e.g. Facilities Manager, ext. 1234"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea 
                                id="description" 
                                value={formData.description} 
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} 
                                placeholder="Additional details about the room features, access requirements, etc."
                                className="h-20"
                            />
                        </div>
                    </div>

                    {/* Equipment */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-gray-900">Equipment</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {ALL_EQUIPMENT.map(item => (
                                <div key={item} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`equip-${item}`}
                                        checked={formData.equipment?.includes(item)}
                                        onCheckedChange={() => handleEquipmentChange(item)}
                                    />
                                    <label htmlFor={`equip-${item}`} className="text-sm font-medium cursor-pointer">
                                        {item}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveClick} 
                        disabled={saving || !formData.name.trim() || !formData.capacity || !formData.floor}
                    >
                        {saving ? 'Saving...' : (room ? 'Update Room' : 'Save Room')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}