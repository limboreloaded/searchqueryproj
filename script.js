// Voice Search Engine - Audio API Implementation
// Stage 2: Canvas API for visualization
// Stage 3: Audio API for microphone access

document.addEventListener('DOMContentLoaded', function() {
    const voiceButton = document.getElementById('voiceButton');
    const textInput = document.getElementById('textInput');
    const searchButton = document.getElementById('searchButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const voiceInstruction = document.getElementById('voiceInstruction');
    const resultsSection = document.getElementById('resultsSection');
    const queryText = document.getElementById('queryText');
    const resultsContainer = document.getElementById('resultsContainer');
    const canvas = document.getElementById('audioVisualization');

    // Audio API variables
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let dataArray = null;
    let isRecording = false;
    let animationFrameId = null;
    
    // Speech Recognition variables
    let recognition = null;
    let isSpeechRecognitionSupported = false;
    
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        isSpeechRecognitionSupported = true;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Handle recognition results
        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update text input with the transcript
            if (finalTranscript) {
                textInput.value = finalTranscript.trim();
            } else if (interimTranscript) {
                textInput.value = interimTranscript;
            }
        };
        
        // Handle recognition errors
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                voiceInstruction.textContent = 'No speech detected. Try again.';
            } else if (event.error === 'audio-capture') {
                voiceInstruction.textContent = 'No microphone found.';
            } else if (event.error === 'not-allowed') {
                voiceInstruction.textContent = 'Microphone permission denied.';
            }
        };
        
        // Handle recognition end
        recognition.onend = function() {
            if (isRecording) {
                // Restart recognition if still recording
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition already started or error:', e);
                }
            }
        };
    } else {
        console.warn('Speech recognition not supported in this browser');
        voiceInstruction.textContent = 'Speech recognition not supported. Please use Chrome or Edge.';
    }

    // Initialize canvas
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Set initial background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            if (!isRecording) {
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        });
    }

    // Voice button click handler with microphone access
    voiceButton.addEventListener('click', async function() {
        if (!isRecording) {
            // Start recording
            try {
                await startRecording();
            } catch (error) {
                console.error('Error starting recording:', error);
                voiceInstruction.textContent = 'Error: Could not access microphone';
                voiceInstruction.style.color = '#ea4335';
                setTimeout(() => {
                    voiceInstruction.textContent = 'Click to start voice search';
                    voiceInstruction.style.color = '';
                }, 3000);
            }
        } else {
            // Stop recording
            stopRecording();
        }
    });

    // Start recording function
    async function startRecording() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            
            // Configure analyser
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Connect microphone to analyser
            microphone.connect(analyser);
            
            // Update UI
            isRecording = true;
            voiceButton.classList.add('recording');
            recordingStatus.style.display = 'flex';
            voiceInstruction.textContent = 'Listening... Click again to stop';
            voiceInstruction.style.color = '';
            
            // Start visualization
            visualize();
            
            // Start speech recognition
            if (isSpeechRecognitionSupported && recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition already started or error:', e);
                }
            }
            
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                voiceInstruction.textContent = 'Microphone permission denied. Please allow access.';
                voiceInstruction.style.color = '#ea4335';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                voiceInstruction.textContent = 'No microphone found. Please connect a microphone.';
                voiceInstruction.style.color = '#ea4335';
            } else {
                voiceInstruction.textContent = 'Error accessing microphone: ' + error.message;
                voiceInstruction.style.color = '#ea4335';
            }
            throw error;
        }
    }

    // Stop recording function
    function stopRecording() {
        // Stop speech recognition
        if (isSpeechRecognitionSupported && recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.log('Error stopping recognition:', e);
            }
        }
        
        if (microphone) {
            // Stop all tracks
            microphone.mediaStream.getTracks().forEach(track => track.stop());
            microphone.disconnect();
            microphone = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
            audioContext = null;
        }
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Update UI
        isRecording = false;
        voiceButton.classList.remove('recording');
        recordingStatus.style.display = 'none';
        
        // If we have text in the input, offer to search
        if (textInput.value.trim()) {
            voiceInstruction.textContent = 'Click to search or speak again';
            // Optionally auto-search after a short delay
            setTimeout(() => {
                if (textInput.value.trim() && !isRecording) {
                    performSearch(textInput.value);
                }
            }, 500);
        } else {
            voiceInstruction.textContent = 'Click to start voice search';
        }
        
        // Clear canvas
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Audio visualization function (Canvas API - Stage 2)
    function visualize() {
        if (!analyser || !canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        function draw() {
            if (!isRecording || !analyser) return;
            
            animationFrameId = requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            // Clear canvas
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, width, height);
            
            // Draw waveform
            const barWidth = (width / dataArray.length) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < dataArray.length; i++) {
                barHeight = (dataArray[i] / 255) * height;
                
                // Create gradient
                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }

    // Text search handler (placeholder)
    function performSearch(query) {
        if (!query.trim()) return;

        queryText.textContent = query;
        resultsSection.style.display = 'block';
        
        // Placeholder results for demonstration
        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-title">
                    <a href="#">Sample Search Result 1</a>
                </div>
                <div class="result-url">https://example.com/result1</div>
                <div class="result-snippet">
                    This is a sample search result snippet. In later stages, this will be populated with actual search results based on your voice query.
                </div>
            </div>
            <div class="result-item">
                <div class="result-title">
                    <a href="#">Sample Search Result 2</a>
                </div>
                <div class="result-url">https://example.com/result2</div>
                <div class="result-snippet">
                    Another sample result. The search functionality will be fully implemented in later stages with Audio API integration.
                </div>
            </div>
        `;

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Search button click
    searchButton.addEventListener('click', function() {
        performSearch(textInput.value);
    });

    // Enter key in text input
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(textInput.value);
        }
    });
});

