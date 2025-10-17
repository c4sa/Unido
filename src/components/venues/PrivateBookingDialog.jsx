
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from 'lucide-react';
import { format } from "date-fns";

export default function PrivateBookingDialog({ room, onSave, children }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        topic: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSaveClick = async () => {
        setSaving(true);
        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);
        await onSave(room, start, end, formData.topic);
        setSaving(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Private Reservation for {room.name}</DialogTitle>
                    <DialogDescription>Book this room for an admin-only event. This will not be tied to a delegate meeting.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic">Reservation Topic</Label>
                        <Input id="topic" value={formData.topic} onChange={(e) => setFormData(p => ({ ...p, topic: e.target.value }))} placeholder="e.g., Maintenance, VIP Visit" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-3 sm:col-span-1">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input id="startTime" type="time" value={formData.startTime} onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input id="endTime" type="time" value={formData.endTime} onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveClick} disabled={saving || !formData.topic}>
                        {saving ? 'Saving...' : 'Reserve Room'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
