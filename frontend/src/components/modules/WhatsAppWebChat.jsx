import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import {
  IconBrandWhatsapp,
  IconSearch,
  IconSend,
  IconCheck,
  IconChecks,
  IconRefresh,
  IconPlus,
  IconBuildingStore,
  IconStethoscope,
  IconPhone,
  IconAlertCircle,
  IconX,
  IconSparkles,
  IconCopy,
  IconMessageDots,
  IconUser,
  IconShieldCheck
} from '@tabler/icons-react';

export function WhatsAppWebChat({ config }) {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'gym' | 'consultorio' | 'unread'
  
  // Modal para iniciar nuevo chat
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Menú rápido de simulación de respuestas de prueba
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar lista de conversaciones
  const fetchChats = async (selectPhoneAfter = null) => {
    try {
      setLoadingChats(true);
      const res = await api.get('/notifications/chats');
      const data = res.data?.data || [];
      setChats(data);

      if (selectPhoneAfter) {
        setSelectedPhone(selectPhoneAfter);
      } else if (!selectedPhone && data.length > 0) {
        setSelectedPhone(data[0].phone);
      }
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
      toast.error('No se pudieron cargar los chats de WhatsApp');
    } finally {
      setLoadingChats(false);
    }
  };

  // Cargar mensajes de la conversación activa
  const fetchMessages = async (phone) => {
    if (!phone) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/notifications/chats/${encodeURIComponent(phone)}/messages`);
      const msgs = res.data?.data || [];
      setMessages(msgs);

      // Actualizar contador no leídos en la lista local de chats
      setChats(prev => prev.map(c => c.phone === phone ? { ...c, unread_count: 0 } : c));
    } catch (err) {
      console.error('Error al cargar historial de mensajes:', err);
      toast.error('Error al cargar los mensajes del chat');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar contactos (clientes y pacientes) para modal de Nuevo Chat
  const loadContactsForNewChat = async () => {
    try {
      setLoadingContacts(true);
      setShowNewChatModal(true);

      const [clientsRes, patientsRes] = await Promise.all([
        api.get('/clients?status=all').catch(() => ({ data: [] })),
        api.get('/patients').catch(() => ({ data: [] }))
      ]);

      const clientList = (clientsRes.data?.data || clientsRes.data || []).map(c => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente sin nombre',
        phone: c.phone || '',
        entity_type: 'gym',
        plan: c.plan_name || 'Gimnasio'
      }));

      const patientList = (patientsRes.data?.data || patientsRes.data || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Paciente sin nombre',
        phone: p.phone || '',
        entity_type: 'consultorio',
        plan: 'Nutrición'
      }));

      // Filtrar aquellos que tengan teléfono válido
      const combined = [...clientList, ...patientList].filter(item => item.phone && item.phone !== '0000000000');
      setContacts(combined);
    } catch (err) {
      console.error('Error al cargar lista de contactos:', err);
      toast.error('Error al cargar clientes y pacientes');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Iniciar conversación con un contacto
  const handleStartChatWithContact = (contact) => {
    setShowNewChatModal(false);
    setSelectedPhone(contact.phone);

    // Si no existe aún en la lista local de chats, agregarlo temporalmente
    const exists = chats.some(c => c.phone === contact.phone);
    if (!exists) {
      const newChatEntry = {
        id: `temp_${Date.now()}`,
        phone: contact.phone,
        contact_name: contact.name,
        resolved_entity_type: contact.entity_type,
        message: 'Conversación iniciada',
        created_at: new Date().toISOString(),
        unread_count: 0
      };
      setChats([newChatEntry, ...chats]);
      setMessages([]);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText !== null ? customText : newMessage).trim();
    if (!textToSend || !selectedPhone || sending) return;

    const currentChat = chats.find(c => c.phone === selectedPhone);

    try {
      setSending(true);
      const res = await api.post(`/notifications/chats/${encodeURIComponent(selectedPhone)}/send`, {
        message: textToSend,
        entity_type: currentChat?.resolved_entity_type || 'gym',
        client_id: currentChat?.resolved_client_id || null,
        patient_id: currentChat?.resolved_patient_id || null,
      });

      const sentMsg = res.data?.data;
      if (sentMsg) {
        setMessages(prev => [...prev, sentMsg]);
        setNewMessage('');
        
        // Actualizar último mensaje en lista de chats
        setChats(prev => prev.map(c => c.phone === selectedPhone ? {
          ...c,
          message: textToSend,
          created_at: sentMsg.created_at || new Date().toISOString(),
          status: sentMsg.status,
          direction: 'outbound'
        } : c));

        if (sentMsg.status === 'failed') {
          toast.error('Mensaje guardado pero la API de Meta devolvió error (verifica tu token o usa Modo Prueba)');
        }
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al enviar el mensaje de WhatsApp';
      toast.error(errorMsg);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Simular respuesta entrante del cliente para pruebas
  const handleSimulateReply = async (replyText) => {
    if (!selectedPhone || simulating) return;
    try {
      setSimulating(true);
      setShowSimulateMenu(false);

      const res = await api.post('/notifications/chats/simulate-reply', {
        phone: selectedPhone,
        message: replyText,
      });

      const incomingMsg = res.data?.data;
      if (incomingMsg) {
        setMessages(prev => [...prev, incomingMsg]);
        toast.success(`Mensaje recibido de ${selectedChat?.contact_name || selectedPhone}`);

        // Actualizar la lista lateral de chats
        setChats(prev => prev.map(c => c.phone === selectedPhone ? {
          ...c,
          message: replyText,
          created_at: incomingMsg.created_at || new Date().toISOString(),
          status: 'received',
          direction: 'inbound'
        } : c));
      }
    } catch (err) {
      console.error('Error simulando respuesta:', err);
      toast.error('No se pudo simular la respuesta');
    } finally {
      setSimulating(false);
    }
  };

  // Copiar teléfono
  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    toast.success(`Teléfono ${phone} copiado al portapapeles`);
  };

  // Filtrado de chats
  const filteredChats = chats.filter(chat => {
    const matchesSearch = 
      (chat.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (chat.phone || '').includes(searchTerm) ||
      (chat.message || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'gym') return chat.resolved_entity_type === 'gym';
    if (filterType === 'consultorio') return chat.resolved_entity_type === 'consultorio';
    if (filterType === 'unread') return (chat.unread_count || 0) > 0;
    return true;
  });

  const selectedChat = chats.find(c => c.phone === selectedPhone);

  // Formato de hora amigable
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hoy';
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
      return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  // Plantillas rápidas para enviar con 1 clic
  const QUICK_TEMPLATES = [
    { label: '🏋️ Vencimiento', text: `Hola ${selectedChat?.contact_name || ''}! 🏋️ Te recordamos que tu membresía en Pimpon Gym vence pronto. ¡Renueva a tiempo para seguir entrenando!` },
    { label: '⏰ Cita Nutrición', text: `Hola ${selectedChat?.contact_name || ''}! ⏰ Te recordamos tu cita programada de nutrición en Pimpon Consultorio. ¡Te esperamos puntual!` },
    { label: '💪 Reenganche', text: `Hola ${selectedChat?.contact_name || ''}! 💪 Te extrañamos en Pimpon Gym. ¡Tenemos una promoción especial para que retomes tus entrenamientos hoy!` },
    { label: '🍏 Plan Actualizado', text: `Hola ${selectedChat?.contact_name || ''}! 🍏 Te compartimos la actualización de tu plan nutricional. Recuerda registrar tus avances en la app.` },
    { label: '💳 Datos de Pago', text: `Hola ${selectedChat?.contact_name || ''}! Puedes realizar tu pago por transferencia o directamente en recepción. ¡Gracias por tu preferencia!` },
  ];

  const SIMULATED_REPLIES = [
    '¡Hola buenas tardes! ¿A qué hora abren mañana para pasar a pagar?',
    'Perfecto, muchas gracias por avisar. Ya voy en camino a mi cita.',
    'Enterado coach, el lunes regreso con toda la actitud 💪',
    'Hola! ¿Me podrían compartir el número de cuenta para transferir?',
    'Muchas gracias! Ya descargué mi nuevo plan de alimentación 🍏',
  ];

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden flex flex-col h-[750px] relative">
      
      {/* BARRA SUPERIOR DE ESTADO META CLOUD API */}
      <div className="bg-[var(--color-surface)] px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <IconBrandWhatsapp size={18} className="text-emerald-500" />
          <span className="font-bold text-[var(--color-text)]">Pimpon WhatsApp Web Oficial</span>
          <span className="text-[var(--color-text-muted)]">|</span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
            config?.mode === 'meta_cloud_api' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config?.mode === 'meta_cloud_api' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {config?.mode === 'meta_cloud_api' ? 'Meta Cloud API (En vivo)' : 'Modo Prueba / Simulación'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--color-text-muted)] hidden sm:inline">
            Sincronización bidireccional activa
          </span>
          <button
            onClick={() => fetchChats(selectedPhone)}
            className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-card-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white transition-all cursor-pointer"
            title="Recargar conversaciones"
          >
            <IconRefresh size={14} className={loadingChats ? 'animate-spin text-[var(--color-gold)]' : ''} />
          </button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL TIPO DOS COLUMNAS DE WHATSAPP WEB */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= COLUMNA IZQUIERDA: LISTA DE CONVERSACIONES ================= */}
        <div className="w-80 md:w-96 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0">
          
          {/* Header de la columna izquierda con botón Nuevo Chat */}
          <div className="p-3 border-b border-[var(--color-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[var(--color-text)] flex items-center gap-2">
                <IconMessageDots size={18} className="text-[var(--color-gold)]" />
                <span>Conversaciones ({chats.length})</span>
              </h2>

              <button
                onClick={loadContactsForNewChat}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-[var(--radius-sm)] bg-[var(--color-gold)] text-white hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <IconPlus size={14} />
                <span>Nuevo Chat</span>
              </button>
            </div>

            {/* Buscador de chats */}
            <div className="relative">
              <IconSearch size={15} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Buscar cliente, paciente o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--color-card-alt)] border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-sm)] focus:border-[var(--color-gold)] focus:outline-none transition-all placeholder:text-[var(--color-text-muted)]/60"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-[var(--color-text-muted)] hover:text-white"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Chips de filtro */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-[var(--color-gold)] text-white' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('gym')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${filterType === 'gym' ? 'bg-[var(--color-gold)] text-white' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <IconBuildingStore size={12} />
                <span>Gimnasio</span>
              </button>
              <button
                onClick={() => setFilterType('consultorio')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${filterType === 'consultorio' ? 'bg-[var(--color-gold)] text-white' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <IconStethoscope size={12} />
                <span>Consultorio</span>
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${filterType === 'unread' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-card-alt)] text-[var(--color-text-muted)] hover:text-white'}`}
              >
                No leídos
              </button>
            </div>
          </div>

          {/* Lista scrolleable de chats */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/50">
            {loadingChats ? (
              <div className="p-8 text-center space-y-2">
                <IconRefresh className="animate-spin text-[var(--color-gold)] mx-auto" size={24} />
                <p className="text-xs text-[var(--color-text-muted)]">Cargando conversaciones...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--color-card-alt)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                  <IconMessageDots size={24} />
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {searchTerm ? 'No se encontraron conversaciones con ese filtro.' : 'No hay chats aún.'}
                </p>
                <button
                  onClick={loadContactsForNewChat}
                  className="text-xs text-[var(--color-gold)] font-bold hover:underline cursor-pointer"
                >
                  + Iniciar primer chat
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.phone === selectedPhone;
                const isGym = chat.resolved_entity_type === 'gym';
                const hasUnread = (chat.unread_count || 0) > 0;

                return (
                  <div
                    key={chat.id || chat.phone}
                    onClick={() => setSelectedPhone(chat.phone)}
                    className={`p-3 transition-all cursor-pointer flex items-center gap-3 relative border-l-4 ${
                      isSelected 
                        ? 'bg-[var(--color-card-alt)] border-l-[var(--color-gold)]' 
                        : 'hover:bg-[var(--color-card-alt)]/60 border-l-transparent'
                    }`}
                  >
                    {/* Avatar con icono indicador */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        isGym ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {(chat.contact_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow ${
                        isGym ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
                      }`}>
                        {isGym ? '🏋' : '🩺'}
                      </div>
                    </div>

                    {/* Info del chat */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[var(--color-gold)] font-extrabold' : 'text-[var(--color-text)]'}`}>
                          {chat.contact_name || chat.phone}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 font-mono">
                          {formatDate(chat.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                          isGym ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {isGym ? 'Gimnasio' : 'Consultorio'}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] truncate font-mono">
                          {chat.phone}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1 gap-1">
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate flex items-center gap-1">
                          {chat.direction === 'outbound' && (
                            <IconChecks size={13} className={chat.status === 'read' ? 'text-cyan-400 shrink-0' : 'text-[var(--color-text-muted)] shrink-0'} />
                          )}
                          <span className="truncate">{chat.message || 'Mensaje de WhatsApp'}</span>
                        </p>

                        {hasUnread && (
                          <span className="bg-emerald-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMNA DERECHA: PANTALLA PRINCIPAL DE CHAT ================= */}
        <div className="flex-1 flex flex-col bg-[var(--color-card)] relative">
          
          {selectedChat ? (
            <>
              {/* HEADER DE LA CONVERSACIÓN ACTIVA */}
              <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow ${
                    selectedChat.resolved_entity_type === 'gym' 
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40' 
                      : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {(selectedChat.contact_name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--color-text)]">
                        {selectedChat.contact_name || 'Contacto de WhatsApp'}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        selectedChat.resolved_entity_type === 'gym' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {selectedChat.resolved_entity_type === 'gym' ? '🏋️ Cliente Gimnasio' : '🩺 Paciente Nutrición'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="font-mono">{selectedChat.phone}</span>
                      <button
                        onClick={() => handleCopyPhone(selectedChat.phone)}
                        className="hover:text-white transition-all cursor-pointer"
                        title="Copiar teléfono"
                      >
                        <IconCopy size={13} />
                      </button>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Conectado vía WhatsApp API
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la barra superior */}
                <div className="flex items-center gap-2 relative">
                  {/* Botón para Simular Respuesta de Prueba */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSimulateMenu(!showSimulateMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold bg-[var(--color-card-alt)] hover:bg-[var(--color-border)] text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer shadow-sm"
                      title="Probar recepción de mensaje del cliente"
                    >
                      <IconSparkles size={14} />
                      <span className="hidden sm:inline">Simular Respuesta</span>
                    </button>

                    {showSimulateMenu && (
                      <div className="absolute right-0 mt-2 w-72 bg-[var(--color-card-alt)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2 shadow-2xl z-30 space-y-1 text-xs">
                        <div className="p-1.5 font-bold text-[var(--color-gold)] border-b border-[var(--color-border)] flex items-center justify-between">
                          <span>Simular mensaje del cliente:</span>
                          <button onClick={() => setShowSimulateMenu(false)} className="text-[var(--color-text-muted)] hover:text-white">
                            <IconX size={13} />
                          </button>
                        </div>
                        {SIMULATED_REPLIES.map((rep, idx) => (
                          <button
                            key={idx}
                            disabled={simulating}
                            onClick={() => handleSimulateReply(rep)}
                            className="w-full text-left p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text)] text-[11px] transition-all cursor-pointer"
                          >
                            💬 "{rep}"
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => fetchMessages(selectedPhone)}
                    className="p-2 rounded-[var(--radius-sm)] bg-[var(--color-card-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white transition-all cursor-pointer"
                    title="Actualizar mensajes"
                  >
                    <IconRefresh size={16} className={loadingMessages ? 'animate-spin text-[var(--color-gold)]' : ''} />
                  </button>
                </div>
              </div>

              {/* FLUJO DE BURBUJAS DE MENSAJES (ESTILO WHATSAPP WEB) */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0c]"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(226, 154, 0, 0.02) 0%, transparent 60%)`,
                }}
              >
                {/* Banner de cifrado/seguridad tipo WhatsApp */}
                <div className="flex justify-center my-2">
                  <div className="bg-[var(--color-card-alt)]/80 backdrop-blur-sm border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm text-center">
                    <IconShieldCheck size={14} className="text-[var(--color-gold)]" />
                    <span>Los mensajes se envían de forma segura y directa a través de la API Oficial de WhatsApp de Meta.</span>
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
                    <IconRefresh className="animate-spin text-[var(--color-gold)]" size={28} />
                    <span className="text-xs">Cargando historial de la conversación...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
                    <IconMessageDots size={36} className="text-[var(--color-border)]" />
                    <p className="text-xs font-semibold">Aún no hay mensajes en este chat.</p>
                    <p className="text-[11px]">Escribe un mensaje abajo para comenzar a comunicarte.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isFailed = msg.status === 'failed';
                    const isTemplate = msg.message_type === 'template';

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md relative text-xs leading-relaxed ${
                            isOutbound
                              ? 'bg-gradient-to-br from-[#2a1b02] to-[#3a2603] text-white border border-[#563b0a] rounded-tr-none'
                              : 'bg-[#18181b] text-[var(--color-text)] border border-[var(--color-border)] rounded-tl-none'
                          }`}
                        >
                          {/* Badge si fue enviado por plantilla oficial */}
                          {isTemplate && (
                            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-black/30 px-2 py-0.5 rounded-md w-fit">
                              <IconSparkles size={12} />
                              <span>Plantilla Oficial Meta</span>
                            </div>
                          )}

                          {/* Imagen si contiene mediaUrl */}
                          {msg.media_url && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                              <img
                                src={msg.media_url}
                                alt="Adjunto"
                                className="max-h-48 w-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {/* Cuerpo del texto */}
                          <p className="whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>

                          {/* Pie de la burbuja: Hora y Estado */}
                          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-white/50 select-none">
                            <span>{formatTime(msg.created_at)}</span>

                            {isOutbound && (
                              <span>
                                {isFailed ? (
                                  <span className="text-red-400 flex items-center gap-0.5" title="Fallo de envío en Meta API">
                                    <IconAlertCircle size={13} />
                                    <span>Error</span>
                                  </span>
                                ) : msg.status === 'read' ? (
                                  <IconChecks size={14} className="text-cyan-400" title="Leído por el destinatario" />
                                ) : msg.status === 'delivered' ? (
                                  <IconChecks size={14} className="text-white/60" title="Entregado" />
                                ) : (
                                  <IconCheck size={14} className="text-white/40" title="Enviado" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* BARRA DE PLANTILLAS RÁPIDAS */}
              <div className="px-3 py-1.5 bg-[var(--color-surface)] border-t border-[var(--color-border)]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] shrink-0 flex items-center gap-1">
                  <IconSparkles size={12} className="text-[var(--color-gold)]" />
                  <span>Plantillas:</span>
                </span>
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(tmpl.text)}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--color-card-alt)] hover:bg-[var(--color-gold)]/20 hover:text-[var(--color-gold)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-all cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* CAMPO DE ENTRADA Y ENVÍO */}
              <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-end gap-2 shrink-0">
                <div className="flex-1 bg-[var(--color-card-alt)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus-within:border-[var(--color-gold)] transition-all p-2 flex items-center">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje de WhatsApp (Enter para enviar)..."
                    className="w-full text-xs bg-transparent text-[var(--color-text)] focus:outline-none resize-none max-h-24 no-scrollbar"
                  />
                </div>

                <button
                  type="button"
                  disabled={!newMessage.trim() || sending}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-gold)] text-white hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer shrink-0 flex items-center justify-center"
                  title="Enviar mensaje"
                >
                  {sending ? (
                    <IconRefresh size={18} className="animate-spin" />
                  ) : (
                    <IconSend size={18} />
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ZERO STATE CUANDO NO HAY CHAT SELECCIONADO */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl">
                <IconBrandWhatsapp size={44} />
              </div>

              <div className="max-w-md space-y-2">
                <h3 className="text-base font-extrabold text-[var(--color-text)]">
                  Pimpon WhatsApp Web
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Lee y responde conversaciones de clientes del gimnasio y pacientes del consultorio en tiempo real directamente desde tu sistema con Meta Cloud API.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={loadContactsForNewChat}
                  className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-gold)] text-white font-bold text-xs shadow-md hover:brightness-110 transition-all cursor-pointer"
                >
                  <IconPlus size={16} />
                  <span>Iniciar un Nuevo Chat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: INICIAR NUEVO CHAT CON CLIENTE O PACIENTE ================= */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header del Modal */}
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold)] flex items-center justify-center">
                  <IconPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Nuevo Chat de WhatsApp</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Selecciona un cliente o paciente para iniciar conversación</p>
                </div>
              </div>

              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-[var(--color-text-muted)] hover:text-white p-1"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Buscador dentro del modal */}
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-card)]">
              <div className="relative">
                <IconSearch size={15} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o plan..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-card-alt)] border border-[var(--color-border)] text-[var(--color-text)] rounded-[var(--radius-sm)] focus:border-[var(--color-gold)] focus:outline-none"
                />
              </div>
            </div>

            {/* Lista de contactos */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/50 p-2">
              {loadingContacts ? (
                <div className="p-8 text-center space-y-2 text-[var(--color-text-muted)]">
                  <IconRefresh className="animate-spin text-[var(--color-gold)] mx-auto" size={24} />
                  <p className="text-xs">Cargando directorio de clientes y pacientes...</p>
                </div>
              ) : contacts.filter(c => 
                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
                  c.phone.includes(contactSearch) ||
                  (c.plan || '').toLowerCase().includes(contactSearch.toLowerCase())
                ).length === 0 ? (
                <div className="p-8 text-center text-[var(--color-text-muted)] text-xs">
                  No se encontraron contactos con teléfono válido.
                </div>
              ) : (
                contacts
                  .filter(c => 
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
                    c.phone.includes(contactSearch) ||
                    (c.plan || '').toLowerCase().includes(contactSearch.toLowerCase())
                  )
                  .map((contact) => {
                    const isGym = contact.entity_type === 'gym';
                    return (
                      <div
                        key={`${contact.entity_type}_${contact.id}`}
                        onClick={() => handleStartChatWithContact(contact)}
                        className="p-3 hover:bg-[var(--color-card-alt)] rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isGym ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {contact.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-xs font-bold text-[var(--color-text)]">{contact.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                              <span className="font-mono">{contact.phone}</span>
                              <span>•</span>
                              <span>{contact.plan}</span>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          isGym ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isGym ? 'Gimnasio' : 'Consultorio'}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-[var(--radius-sm)] bg-[var(--color-card-alt)] text-[var(--color-text-muted)] hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
