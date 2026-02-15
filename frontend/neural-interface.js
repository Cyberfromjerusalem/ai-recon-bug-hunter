// frontend/neural-interface.js
// COMPLETE FILE WITH ALL CLASSES - NeuralInterface, QuantumVisualizer, and ThreeDVisualizer

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded. 3D visualization will not work.');
}

// ============================================================================
// NEURAL INTERFACE CLASS - Brain Wave Visualization
// ============================================================================

class NeuralInterface {
    constructor() {
        this.brainWaves = [];
        this.neuralConnections = [];
        this.synapticPlasticity = 0;
        this.neurons = [];
        this.canvas = null;
        this.ctx = null;
        this.initializeNeuralNetwork();
    }

    initializeNeuralNetwork() {
        // Create neural network visualization
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'neuralCanvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '2';
        this.canvas.style.pointerEvents = 'none';
        
        // Only add if not already present
        if (!document.getElementById('neuralCanvas')) {
            document.getElementById('holodeck').appendChild(this.canvas);
        } else {
            this.canvas = document.getElementById('neuralCanvas');
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize neurons
        this.neurons = [];
        for (let i = 0; i < 100; i++) {
            this.neurons.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                activation: Math.random(),
                connections: [],
                velocity: {
                    x: (Math.random() - 0.5) * 0.5,
                    y: (Math.random() - 0.5) * 0.5
                }
            });
        }
        
        // Create random connections
        this.neurons.forEach((neuron, i) => {
            for (let j = 0; j < 3; j++) {
                const target = Math.floor(Math.random() * this.neurons.length);
                if (target !== i) {
                    neuron.connections.push({
                        target,
                        weight: Math.random() * 2 - 1
                    });
                }
            }
        });
        
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update neuron positions with gentle movement
        this.neurons.forEach(neuron => {
            neuron.x += neuron.velocity.x;
            neuron.y += neuron.velocity.y;
            
            // Bounce off edges
            if (neuron.x < 0 || neuron.x > this.canvas.width) neuron.velocity.x *= -1;
            if (neuron.y < 0 || neuron.y > this.canvas.height) neuron.velocity.y *= -1;
            
            // Keep in bounds
            neuron.x = Math.max(0, Math.min(this.canvas.width, neuron.x));
            neuron.y = Math.max(0, Math.min(this.canvas.height, neuron.y));
        });
        
        // Update activations
        this.updateActivations();
        
        // Draw connections
        this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        this.ctx.lineWidth = 1;
        
        this.neurons.forEach(neuron => {
            neuron.connections.forEach(conn => {
                const target = this.neurons[conn.target];
                if (target) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(neuron.x, neuron.y);
                    this.ctx.lineTo(target.x, target.y);
                    
                    // Connection color based on weight and activation
                    const alpha = Math.abs(conn.weight) * 0.3 * (neuron.activation + target.activation) / 2;
                    this.ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
                    this.ctx.stroke();
                }
            });
        });
        
        // Draw neurons
        this.neurons.forEach(neuron => {
            const radius = 3 + neuron.activation * 5;
            
            // Glow effect
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = `rgba(0, 255, 136, ${neuron.activation * 0.8})`;
            
            this.ctx.beginPath();
            this.ctx.arc(neuron.x, neuron.y, radius, 0, Math.PI * 2);
            
            // Gradient fill
            const gradient = this.ctx.createRadialGradient(
                neuron.x - 2, neuron.y - 2, 1,
                neuron.x, neuron.y, radius * 2
            );
            gradient.addColorStop(0, `rgba(0, 255, 136, ${neuron.activation})`);
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        });
        
        requestAnimationFrame(() => this.animate());
    }

    updateActivations() {
        // Forward pass through network
        const newActivations = [];
        
        this.neurons.forEach((neuron, i) => {
            let sum = 0;
            neuron.connections.forEach(conn => {
                sum += this.neurons[conn.target].activation * conn.weight;
            });
            // Sigmoid activation with some randomness
            newActivations[i] = 1 / (1 + Math.exp(-sum)) + (Math.random() - 0.5) * 0.1;
            newActivations[i] = Math.max(0, Math.min(1, newActivations[i]));
        });
        
        // Update activations
        this.neurons.forEach((neuron, i) => {
            neuron.activation = newActivations[i];
        });
    }

    processInput(input) {
        // Set input neurons based on data
        const inputNeurons = this.neurons.slice(0, Math.min(10, input?.length || 0));
        inputNeurons.forEach((neuron, i) => {
            if (input && input[i] !== undefined) {
                neuron.activation = Math.min(1, Math.max(0, input[i]));
            }
        });
    }

    getOutput() {
        // Get output from last 10 neurons
        const outputNeurons = this.neurons.slice(-10);
        return outputNeurons.map(n => n.activation);
    }
}

// ============================================================================
// QUANTUM VISUALIZER CLASS - Quantum State Visualization
// ============================================================================

class QuantumVisualizer {
    constructor() {
        this.quantumStates = [];
        this.probabilityCloud = [];
        this.entanglementLines = [];
        this.canvas = null;
        this.ctx = null;
        this.initializeCanvas();
    }

    initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'quantumCanvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '3';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.mixBlendMode = 'screen';
        
        if (!document.getElementById('quantumCanvas')) {
            document.getElementById('holodeck').appendChild(this.canvas);
        } else {
            this.canvas = document.getElementById('quantumCanvas');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    visualizeQuantumState(state) {
        if (!this.ctx) return;
        
        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw probability cloud
        this.drawProbabilityCloud(state);
        
        // Draw quantum particles
        this.drawQuantumParticles(state);
        
        // Draw entanglement lines
        this.drawEntanglement(state);
    }

    drawProbabilityCloud(state) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2;
            const radius = 150 + Math.sin(angle * 8 + Date.now() / 1000) * 30;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 40);
            gradient.addColorStop(0, `rgba(100, 200, 255, ${0.1 + Math.random() * 0.2})`);
            gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 40, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawQuantumParticles(state) {
        const particles = state?.measurements || [];
        const baseX = this.canvas.width / 2 - 200;
        const baseY = this.canvas.height / 2 - 100;
        
        particles.slice(0, 50).forEach((particle, i) => {
            const x = baseX + (i % 10) * 45;
            const y = baseY + Math.floor(i / 10) * 45;
            
            // Particle size varies with quantum state
            const size = 8 + Math.sin(Date.now() / 500 + i) * 4;
            
            // Quantum glow
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
            
            // Gradient fill
            const gradient = this.ctx.createRadialGradient(x - 3, y - 3, 1, x, y, size * 2);
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.9)');
            gradient.addColorStop(0.7, 'rgba(100, 0, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
        });
    }

    drawEntanglement(state) {
        const particles = state?.measurements || [];
        const baseX = this.canvas.width / 2 - 200;
        const baseY = this.canvas.height / 2 - 100;
        
        particles.slice(0, 30).forEach((particle, i) => {
            particles.slice(i + 1, i + 5).forEach((other, j) => {
                if (Math.random() > 0.8) {
                    const x1 = baseX + (i % 10) * 45;
                    const y1 = baseY + Math.floor(i / 10) * 45;
                    const x2 = baseX + ((i + j + 1) % 10) * 45;
                    const y2 = baseY + Math.floor((i + j + 1) / 10) * 45;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    
                    // Curved line for entanglement
                    const cp1x = (x1 + x2) / 2 + Math.sin(Date.now() / 1000) * 30;
                    const cp1y = (y1 + y2) / 2 + Math.cos(Date.now() / 1000) * 30;
                    
                    this.ctx.quadraticCurveTo(cp1x, cp1y, x2, y2);
                    
                    // Entanglement glow
                    this.ctx.strokeStyle = `rgba(255, 0, 255, ${0.2 + Math.random() * 0.3})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = 'rgba(255, 0, 255, 0.5)';
                    
                    this.ctx.stroke();
                }
            });
        });
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }
}

// ============================================================================
// THREE DIMENSIONAL VISUALIZER CLASS - 3D Neural Network
// ============================================================================

class ThreeDVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.connections = [];
        this.stars = null;
        this.animationFrame = null;
        this.initialized = false;
    }

    init() {
        // Check if THREE is available
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded! Make sure to include it in your HTML.');
            return;
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 500;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Add to DOM - make sure it's behind other elements but visible
        const canvas = this.renderer.domElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1';
        canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
        
        // Remove existing canvas if any
        const existingCanvas = document.querySelector('canvas[data-3d="true"]');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        canvas.setAttribute('data-3d', 'true');
        
        document.getElementById('holodeck').appendChild(canvas);

        // Create starfield background
        this.createStarfield();

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);

        // Add directional lights
        const light1 = new THREE.DirectionalLight(0x00ff88, 1);
        light1.position.set(1, 1, 1);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xff3366, 0.5);
        light2.position.set(-1, -0.5, -1);
        this.scene.add(light2);

        // Add point light at center
        const centerLight = new THREE.PointLight(0x00ff88, 0.5, 500);
        centerLight.position.set(0, 0, 0);
        this.scene.add(centerLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.initialized = true;
        
        // Start animation
        this.animate();

        console.log('3D Visualizer initialized successfully');
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        
        for (let i = 0; i < 3000; i++) {
            // Distribute stars in a sphere
            const radius = 800 + Math.random() * 400;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            vertices.push(x, y, z);
            
            // Random colors for stars
            const color = new THREE.Color();
            if (Math.random() > 0.7) {
                color.setHSL(0.8, 1, 0.5); // Purple
            } else if (Math.random() > 0.5) {
                color.setHSL(0.3, 1, 0.5); // Green
            } else {
                color.setHSL(0.6, 1, 0.5); // Blue
            }
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({ 
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    createNeuralNetwork(data) {
        if (!this.initialized || !this.scene) {
            console.warn('3D Visualizer not initialized');
            return;
        }

        // Clear existing particles and connections
        this.clearScene();

        if (!data || !data.subdomains || data.subdomains.length === 0) {
            // Create default test visualization
            this.createTestVisualization();
            return;
        }

        // Create nodes (spheres) for each subdomain
        data.subdomains.forEach((sub, i) => {
            // Determine size based on live status and importance
            const baseSize = sub.isLive ? 10 : 5;
            const importance = sub.technologies?.length || 1;
            const size = baseSize * (1 + importance * 0.1);
            
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            
            // Color based on status and technologies
            let color, emissive;
            if (sub.isLive) {
                // Live subdomains - green with variation
                const hue = 0.3 + (sub.responseTime || 0) / 1000 * 0.1;
                color = new THREE.Color().setHSL(hue, 1, 0.5);
                emissive = new THREE.Color().setHSL(hue, 1, 0.2);
            } else {
                // Dead subdomains - red
                color = new THREE.Color().setHSL(0.0, 1, 0.5);
                emissive = new THREE.Color().setHSL(0.0, 1, 0.2);
            }
            
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: emissive,
                shininess: 30,
                transparent: true,
                opacity: 0.9
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            
            // Position in a 3D fibonacci spiral
            const t = i / Math.max(1, data.subdomains.length - 1);
            const goldenRatio = (1 + Math.sqrt(5)) / 2;
            const angle = i * goldenRatio * Math.PI * 2;
            const radius = 200 + Math.sin(t * Math.PI * 8) * 50;
            
            sphere.position.x = Math.cos(angle) * radius;
            sphere.position.y = Math.sin(angle * 1.5) * radius * 0.5;
            sphere.position.z = Math.sin(angle) * radius;
            
            // Store metadata
            sphere.userData = {
                subdomain: sub.subdomain,
                isLive: sub.isLive,
                index: i,
                technologies: sub.technologies || [],
                responseTime: sub.responseTime || 0
            };
            
            this.scene.add(sphere);
            this.particles.push(sphere);
        });

        // Create connections between related subdomains
        this.createConnections(data);

        // Add a central glow
        this.createCentralGlow();

        // Add floating labels (if needed)
        this.createLabels(data);
    }

    createTestVisualization() {
        // Create a test pattern when no data is available
        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.SphereGeometry(5 + Math.random() * 5, 24, 24);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
                emissive: new THREE.Color().setHSL(Math.random(), 1, 0.2),
                transparent: true,
                opacity: 0.8
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            
            // Position in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 200 + Math.random() * 100;
            
            sphere.position.x = radius * Math.sin(phi) * Math.cos(theta);
            sphere.position.y = radius * Math.sin(phi) * Math.sin(theta);
            sphere.position.z = radius * Math.cos(phi);
            
            sphere.userData = {
                subdomain: `test-${i}.example.com`,
                isLive: Math.random() > 0.5,
                index: i
            };
            
            this.scene.add(sphere);
            this.particles.push(sphere);
        }
        
        this.createConnections({ subdomains: this.particles.map(p => p.userData) });
    }

    createConnections(data) {
        // Create connections between nearby or related subdomains
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                // Only connect some pairs based on proximity and randomness
                const distance = this.particles[i].position.distanceTo(this.particles[j].position);
                
                if (distance < 300 && distance > 50 && Math.random() > 0.85) {
                    // Create a curved line
                    const points = [];
                    const start = this.particles[i].position.clone();
                    const end = this.particles[j].position.clone();
                    
                    // Add control point for curve
                    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                    mid.y += 50 * Math.sin(i * j);
                    
                    points.push(start);
                    points.push(mid);
                    points.push(end);
                    
                    const curve = new THREE.CatmullRomCurve3(points);
                    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
                    
                    // Determine color based on connection type
                    const bothLive = this.particles[i].userData.isLive && this.particles[j].userData.isLive;
                    const color = bothLive ? 0x00ff88 : 0x444488;
                    
                    const material = new THREE.LineBasicMaterial({ 
                        color: color,
                        opacity: 0.15,
                        transparent: true
                    });
                    
                    const line = new THREE.Line(geometry, material);
                    this.scene.add(line);
                    this.connections.push(line);
                }
            }
        }
    }

    createCentralGlow() {
        // Create a central glowing sphere
        const geometry = new THREE.SphereGeometry(40, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(geometry, material);
        this.scene.add(glow);
        
        // Add particles around center
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 60 + Math.random() * 40;
            
            particlePositions[i * 3] = Math.cos(angle) * radius;
            particlePositions[i * 3 + 1] = Math.sin(angle) * radius * 0.5;
            particlePositions[i * 3 + 2] = Math.sin(angle * 2) * radius * 0.3;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ff88,
            size: 2,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);
        this.connections.push(particles); // Store for cleanup
    }

    createLabels(data) {
        // Create text labels for important subdomains (optional)
        // This requires additional libraries for 3D text
    }

    clearScene() {
        // Remove all particles
        this.particles.forEach(p => this.scene.remove(p));
        this.particles = [];
        
        // Remove all connections
        this.connections.forEach(c => this.scene.remove(c));
        this.connections = [];
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    animate() {
        if (!this.initialized || !this.scene || !this.camera || !this.renderer) return;

        this.animationFrame = requestAnimationFrame(() => this.animate());

        // Rotate stars slowly
        if (this.stars) {
            this.stars.rotation.y += 0.0002;
            this.stars.rotation.x += 0.0001;
        }

        // Animate particles
        this.particles.forEach((particle, i) => {
            // Gentle rotation
            particle.rotation.x += 0.005;
            particle.rotation.y += 0.005;
            
            // Subtle floating motion based on position
            const time = Date.now() / 1000;
            const offset = i * 0.1;
            
            particle.position.x += Math.sin(time + offset) * 0.03;
            particle.position.y += Math.cos(time * 1.3 + offset) * 0.03;
            particle.position.z += Math.sin(time * 1.7 + offset) * 0.03;
            
            // Pulse size based on activation
            if (particle.userData.isLive) {
                const scale = 1 + Math.sin(time * 3 + i) * 0.05;
                particle.scale.set(scale, scale, scale);
            }
        });

        // Rotate camera slightly for dynamic effect
        if (this.particles.length > 0) {
            const time = Date.now() / 10000;
            this.camera.position.x = 500 * Math.sin(time);
            this.camera.position.z = 500 * Math.cos(time);
            this.camera.lookAt(0, 0, 0);
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.clearScene();
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        this.initialized = false;
    }

    updateWithScanData(data) {
        // Update visualization with new scan data
        if (data && data.subdomains) {
            this.createNeuralNetwork(data);
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create global instances
let neuralInterface, quantumVisualizer, threeDVisualizer;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing visualization systems...');
    
    // Initialize existing interfaces
    neuralInterface = new NeuralInterface();
    quantumVisualizer = new QuantumVisualizer();
    
    // Make globally available
    window.neuralInterface = neuralInterface;
    window.quantumVisualizer = quantumVisualizer;
    
    // Initialize 3D visualizer if THREE is available
    if (typeof THREE !== 'undefined') {
        threeDVisualizer = new ThreeDVisualizer();
        threeDVisualizer.init();
        window.threeDVisualizer = threeDVisualizer;
        
        // Create default visualization
        setTimeout(() => {
            threeDVisualizer.createTestVisualization();
        }, 100);
        
        console.log('3D Visualizer initialized');
    } else {
        console.warn('Three.js not loaded - 3D visualization disabled');
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (threeDVisualizer) {
        threeDVisualizer.destroy();
    }
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NeuralInterface,
        QuantumVisualizer,
        ThreeDVisualizer
    };
}
