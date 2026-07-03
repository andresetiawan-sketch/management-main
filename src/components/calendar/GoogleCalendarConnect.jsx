import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, CheckCircle, XCircle, Loader2, Link as LinkIcon } from 'lucide-react';

/**
 * GoogleCalendarConnect - Component for employees to connect their Google Calendar
 * 
 * NOTE: This component requires the Google Calendar app user connector to be set up first.
 * Once the connector is registered with connector ID, this component will handle:
 * - OAuth connection flow
 * - Connection status display
 * - Disconnect functionality
 * 
 * Usage:
 * 1. First, set up the Google Calendar connector via Base44 dashboard
 * 2. Replace 'EMPLOYEE_CALENDAR_CONNECTOR_ID' with actual connector ID
 * 3. Import and use this component in MyProfile or ShiftSchedule page
 */

const CONNECTOR_ID = 'EMPLOYEE_CALENDAR_CONNECTOR_ID'; // Replace with actual connector ID after setup

export default function GoogleCalendarConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Try to fetch a protected resource to check if connected
      // Since there's no direct "check connection" API, we'll try to get connection
      // In actual implementation, you'd use a backend function that checks connection status
      setConnected(false); // Placeholder - will be updated after connector setup
    } catch (error) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      // Get OAuth URL from Base44
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      
      // Open in popup and poll for closure
      const popup = window.open(url, '_blank', 'width=600,height=700');
      
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // Re-check connection after OAuth flow completes
          await checkConnection();
          toast.success('Google Calendar berhasil terhubung!');
        }
      }, 500);
    } catch (error) {
      toast.error('Gagal menghubungkan Google Calendar: ' + error.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      toast.success('Google Calendar diputuskan');
    } catch (error) {
      toast.error('Gagal memutuskan: ' + error.message);
    }
  };

  const handleSyncShifts = async () => {
    try {
      setSyncing(true);
      
      // Fetch user's schedules
      const stored = localStorage.getItem('pis_employee');
      if (!stored) {
        toast.error('User not found');
        return;
      }
      
      const employee = JSON.parse(stored);
      const schedules = await base44.entities.ShiftSchedule.list('', 100);
      const mySchedules = schedules.filter(s => 
        (s.karyawan_ids || []).includes(employee.nik_karyawan)
      );

      // Sync each schedule to Google Calendar
      let successCount = 0;
      for (const schedule of mySchedules) {
        try {
          const response = await base44.functions.invoke('syncShiftToCalendar', {
            nik_karyawan: employee.nik_karyawan,
            scheduleId: schedule.id
          });
          
          if (response.data.success) {
            successCount++;
          }
        } catch (err) {
          console.error('Failed to sync schedule:', schedule.id, err);
        }
      }

      toast.success(`${successCount} jadwal shift disinkronkan ke Google Calendar`);
    } catch (error) {
      toast.error('Gagal sinkronisasi: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memeriksa koneksi...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sinkronkan jadwal shift Anda ke Google Calendar pribadi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Terhubung ke Google Calendar</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSyncShifts} 
                disabled={syncing}
                className="flex-1"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {syncing ? 'Menyinkronkan...' : 'Sync Shift Sekarang'}
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Putuskan
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-gray-500">
              <XCircle className="w-5 h-5" />
              <span>Belum terhubung ke Google Calendar</span>
            </div>
            <Button onClick={handleConnect} className="w-full">
              <LinkIcon className="w-4 h-4 mr-2" />
              Hubungkan Google Calendar
            </Button>
            <p className="text-xs text-gray-500">
              Setelah terhubung, jadwal shift Anda akan otomatis muncul di Google Calendar pribadi
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}