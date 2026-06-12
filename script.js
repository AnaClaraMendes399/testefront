const URL_BACKEND = 'https://testeback-rtyx.onrender.com' 

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    let userSessionId = null;

    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Bot';
        } else {
            messageElement.classList.add('status-message');
        }

        if (type === 'error') {
            messageElement.classList.add('error-text');
            sender = '⚠️ Erro';
        } else if (type === 'status') {
            messageElement.classList.add('status-text');
            sender = 'ℹ️ Status';
        }

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    function updateConnectionStatus(status, message) {
        connectionStatus.textContent = message;
        connectionStatus.className = `status-${status}`;
    }

    setChatEnabled(false);
    updateConnectionStatus('offline', 'Desconectado');
    addMessageToChat('Status', 'Clique em "Iniciar conversa" para começar.', 'status');

    function iniciarConversa() {
        if (socket && socket.connected) {
            addMessageToChat('Status', 'Já conectado ao servidor.', 'status');
            return;
        }

        addMessageToChat('Status', 'Conectando ao servidor (pode levar até 60 segundos no plano free)...', 'status');
        updateConnectionStatus('connecting', 'Conectando...');

        // Configuração OTIMIZADA para o Render
        socket = io(URL_BACKEND, {
            transports: ['polling', 'websocket'],  // Polling primeiro, depois WebSocket
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 60000,  // 60 segundos de timeout (importante para o plano free)
            autoConnect: true,
            forceNew: true
        });

        socket.on('connect', () => {
            console.log('✅ Conectado ao servidor! SID:', socket.id);
            reconnectAttempts = 0;
            updateConnectionStatus('online', 'Conectado');
            addMessageToChat('Status', '✅ Conectado ao servidor de chat!', 'status');
            setChatEnabled(true);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão:', error);
            reconnectAttempts++;
            
            let errorMsg = error.message;
            if (error.message === 'timeout') {
                errorMsg = 'Timeout - O servidor pode estar acordando (plano free). Aguarde e tente novamente.';
            }
            
            updateConnectionStatus('offline', 'Erro de conexão');
            addMessageToChat('Erro', `Falha na conexão: ${errorMsg}`, 'error');
            
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                addMessageToChat('Status', 'Máximo de tentativas atingido. Clique em "Iniciar conversa" para tentar novamente.', 'status');
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Desconectado:', reason);
            updateConnectionStatus('offline', 'Desconectado');
            addMessageToChat('Status', `Desconectado: ${reason}`, 'status');
            setChatEnabled(false);
        });

        socket.on('status_conexao', (data) => {
            console.log('Status do servidor:', data);
            if (data.session_id) {
                userSessionId = data.session_id;
                addMessageToChat('Status', `Sessão ID: ${data.session_id.substring(0, 8)}...`, 'status');
            }
            if (data.data) {
                addMessageToChat('Status', data.data, 'status');
            }
        });

        socket.on('nova_mensagem', (data) => {
            console.log('Mensagem recebida:', data);
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            console.error('Erro do servidor:', data);
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    function encerrarConversa() {
        if (socket) {
            socket.disconnect();
            socket = null;
            setChatEnabled(false);
            updateConnectionStatus('offline', 'Desconectado');
            addMessageToChat('Status', 'Conversa encerrada.', 'status');
        }
    }

    function limparTela() {
        chatBox.innerHTML = '';
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Não conectado ao servidor. Clique em "Iniciar conversa".', 'error');
        }
    }

    // Event listeners
    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });
});