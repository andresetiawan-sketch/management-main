import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Camera, X, MessageSquare } from 'lucide-react';
import FullscreenCameraCapture from '@/components/camera/FullscreenCameraCapture';
import { toast } from 'sonner';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function TicketDiscussion({ ticketId }) {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const [pesan, setPesan] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: () => base44.entities.TicketComment.filter({ ticket_id: ticketId }, 'created_date', 200),
    refetchInterval: 5000, // real-time polling every 5s
  });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = base44.entities.TicketComment.subscribe((event) => {
      if (event.data?.ticket_id === ticketId) {
        qc.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      }
    });
    return unsub;
  }, [ticketId]);

  const handleSend = async () => {
    if (!pesan.trim() && !fotoUrl) return;
    setSending(true);
    await base44.entities.TicketComment.create({
      ticket_id: ticketId,
      nik_pengirim: employee.nik_karyawan,
      nama_pengirim: employee.nama_lengkap,
      jabatan_pengirim: employee.jabatan || employee.role || '',
      pesan: pesan.trim(),
      foto_url: fotoUrl || '',
    });
    setPesan('');
    setFotoUrl('');
    qc.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
    setSending(false);
  };

  const myNik = employee.nik_karyawan;

  return (
    <div className="border-t pt-4 mt-2 space-y-3">
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        Diskusi & Komentar
        <span className="font-normal text-gray-400 normal-case">({comments.length})</span>
      </p>

      {/* Comments list */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {isLoading && <p className="text-xs text-gray-400 text-center py-4">Memuat...</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4 italic">Belum ada komentar. Mulai diskusi...</p>
        )}
        {comments.map((c) => {
          const isMe = c.nik_pengirim === myNik;
          return (
            <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-red-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {(c.nama_pengirim || 'A')[0]}
              </div>
              <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-semibold text-gray-600">{c.nama_pengirim}</span>
                  {c.jabatan_pengirim && <span className="text-[9px] text-gray-400">· {c.jabatan_pengirim}</span>}
                </div>
                <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-red-700 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                  {c.pesan && <p className="leading-relaxed whitespace-pre-wrap">{c.pesan}</p>}
                  {c.foto_url && (
                    <img
                      src={c.foto_url}
                      alt="foto komentar"
                      className="mt-1.5 rounded-xl w-full max-w-[200px] object-cover cursor-pointer"
                      onClick={() => window.open(c.foto_url, '_blank')}
                    />
                  )}
                </div>
                <span className="text-[9px] text-gray-400">{formatTime(c.created_date)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="space-y-2">
        {fotoUrl && (
          <div className="relative w-24">
            <img src={fotoUrl} className="w-24 h-24 object-cover rounded-xl border" alt="preview" />
            <button onClick={() => setFotoUrl('')} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={pesan}
            onChange={e => setPesan(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Tulis komentar... (Enter untuk kirim)"
            rows={2}
            className="text-sm resize-none flex-1"
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
              title="Lampir foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || (!pesan.trim() && !fotoUrl)}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Camera */}
      {showCamera && (
        <div className="fixed inset-0 z-[9999]">
          <FullscreenCameraCapture
            label="Foto Komentar"
            onCapture={(url) => { setFotoUrl(url); setShowCamera(false); }}
            disabled={false}
          />
          <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 z-[10000] bg-black/60 text-white rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}