import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, Search, Code2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { MENU_PROMPTS } from '@/data/promptGuideData';

export default function PromptGuide() {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');
  const [expandedKat, setExpandedKat] = useState({});

  const filteredData = MENU_PROMPTS.map((kat) => ({
    ...kat,
    items: kat.items.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase()) ||
    item.deskripsi.toLowerCase().includes(search.toLowerCase())
    )
  })).filter((kat) => kat.items.length > 0);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Prompt disalin! Tempel ke chat AI di VS Code.');
    setTimeout(() => setCopied(''), 2500);
  };

  const toggleKat = (nama) => {
    setExpandedKat((prev) => ({ ...prev, [nama]: !prev[nama] }));
  };

  const totalMenu = MENU_PROMPTS.reduce((acc, kat) => acc + kat.items.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--maroon)] to-[var(--maroon-light)] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Code2 className="w-7 h-7" />
          <h1 className="text-xl font-bold">Panduan Prompt VS Code</h1>
          <Badge className="bg-white/20 text-white border-0 ml-auto">{totalMenu} menu</Badge>
        </div>
        <p className="text-white/80 text-sm">
          Kumpulan prompt <strong className="text-white">lengkap & detail</strong> siap copy-paste untuk membuat setiap fitur di VS Code (Copilot Chat / Cursor AI).
          Setiap prompt mencakup entity schema, business logic, kode contoh, dan semua fitur yang dibutuhkan.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">💡 Cara Penggunaan:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>Buka VS Code dengan ekstensi <strong>GitHub Copilot</strong> atau gunakan <strong>Cursor AI</strong></li>
            <li>Klik tombol <strong>"Salin Prompt"</strong> pada menu yang ingin dibuat</li>
            <li>Buka <strong>Chat AI</strong> (Ctrl+Shift+I di Copilot, atau Ctrl+L di Cursor)</li>
            <li>Tempel prompt (Ctrl+V) dan tekan Enter — AI akan generate kode lengkap</li>
            <li>Jika kurang lengkap, ketik lanjutan: <em>"lanjutkan bagian [nama fitur]"</em></li>
          </ol>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari menu... (contoh: absensi, patroli, slip gaji, kanban)"
          className="pl-9 h-11" />
        
      </div>

      {/* Prompt List */}
      <div className="space-y-3">
        {filteredData.map((kat) =>
        <Card key={kat.kategori} className={`border-2 ${kat.warna} overflow-hidden`}>
            <button
            onClick={() => toggleKat(kat.kategori)}
            className={`w-full flex items-center justify-between p-4 ${kat.warnaHeader} text-white font-semibold text-sm`}>
            
              <span>{kat.kategori}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white text-xs border-0">
                  {kat.items.length} menu
                </Badge>
                {expandedKat[kat.kategori] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>
            {!search && !expandedKat[kat.kategori] ? null :
          <div className="divide-y divide-gray-100">
                {kat.items.map((item) => {
              const copyId = `${kat.kategori}-${item.nama}`;
              const isCopied = copied === copyId;
              return (
                <div key={item.nama} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm">{item.nama}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{item.deskripsi}</p>
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            ~{item.prompt.length.toLocaleString()} karakter · prompt lengkap
                          </p>
                        </div>
                        <Button
                      size="sm"
                      onClick={() => copyToClipboard(item.prompt, copyId)}
                      className={`flex-shrink-0 h-8 text-xs transition-all text-gray-950 bg-[hsl(var(--background))] ${
                      isCopied ?
                      "bg-green-600 hover:bg-green-700" :
                      "hover:bg-[var(--maroon-light)]"}`
                      }>
                      
                          {isCopied ?
                      <><Check className="w-3 h-3 mr-1" /> Tersalin!</> :

                      <><Copy className="w-3 h-3 mr-1" /> Salin Prompt</>
                      }
                        </Button>
                      </div>
                      <pre className="bg-gray-900 text-green-300 text-[10px] rounded-lg p-3 overflow-x-auto max-h-40 font-mono leading-relaxed whitespace-pre-wrap">
                        {item.prompt.slice(0, 600)}{item.prompt.length > 600 ? '\n\n...(klik "Salin Prompt" untuk mendapatkan prompt lengkap)' : ''}
                      </pre>
                    </div>);

            })}
              </div>
          }
          </Card>
        )}
      </div>
    </div>);

}