// --- DATABASE ---
const db = {
    users: JSON.parse(localStorage.getItem('iman_users')) || [],
    posts: JSON.parse(localStorage.getItem('iman_posts')) || [],
    session: JSON.parse(localStorage.getItem('iman_session')) || null,

    save() {
        localStorage.setItem('iman_users', JSON.stringify(this.users));
        localStorage.setItem('iman_posts', JSON.stringify(this.posts));
        localStorage.setItem('iman_session', JSON.stringify(this.session));
    }
};

// --- AUTHENTICATION ---
const auth = {
    isLogin: true,
    toggleMode() {
        this.isLogin = !this.isLogin;
        document.getElementById('auth-title').innerText = this.isLogin ? 'Bem-vindo ao Iman' : 'Crie sua conta';
        document.getElementById('reg-name').classList.toggle('hidden', this.isLogin);
        document.getElementById('auth-switch').innerText = this.isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar';
    },
    submit() {
        const email = document.getElementById('email').value.toLowerCase();
        const pass = document.getElementById('password').value;
        const name = document.getElementById('reg-name').value;

        if (this.isLogin) {
            const user = db.users.find(u => u.email === email && u.pass === pass);
            if (user) this.startSession(user);
            else alert("E-mail ou senha incorretos.");
        } else {
            if (!name || !email || !pass) return alert("Preencha todos os campos.");
            const newUser = {
                id: Date.now(),
                name, email, pass,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                following: [], followers: []
            };
            db.users.push(newUser);
            this.startSession(newUser);
        }
    },
    startSession(user) {
        db.session = user;
        db.save();
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('hdr-avatar').src = user.avatar;
        app.renderFeed();
    },
    logout() {
        db.session = null;
        db.save();
        location.reload();
    }
};

// --- APP LOGIC ---
const app = {
    currentFeed: 'global',

    setFeed(mode) {
        this.currentFeed = mode;
        document.getElementById('tab-global').classList.toggle('active', mode === 'global');
        document.getElementById('tab-following').classList.toggle('active', mode === 'following');
        nav.to('home');
        this.renderFeed();
    },

    createPost() {
        const input = document.getElementById('post-input');
        if (!input.value.trim()) return;

        const newPost = {
            id: Date.now(),
            userId: db.session.id,
            text: input.value,
            likes: [],
            comments: [],
            date: new Date().toISOString()
        };

        db.posts.unshift(newPost);
        db.save();
        input.value = '';
        this.renderFeed();
    },

    toggleLike(postId) {
        const post = db.posts.find(p => p.id === postId);
        const index = post.likes.indexOf(db.session.id);
        if (index > -1) post.likes.splice(index, 1);
        else post.likes.push(db.session.id);
        db.save();
        this.renderFeed();
    },

    addComment(postId) {
        const text = prompt("Digite seu comentário:");
        if (!text) return;
        const post = db.posts.find(p => p.id === postId);
        post.comments.push({
            id: Date.now(),
            userName: db.session.name,
            text: text
        });
        db.save();
        this.renderFeed();
    },

    deletePost(postId) {
        if (!confirm("Deseja excluir este post?")) return;
        db.posts = db.posts.filter(p => p.id !== postId);
        db.save();
        this.renderFeed();
    },

    renderFeed() {
        const container = document.getElementById('feed-container');
        container.innerHTML = '';

        let filteredPosts = db.posts;
        if (this.currentFeed === 'following') {
            filteredPosts = db.posts.filter(p => 
                db.session.following.includes(p.userId) || p.userId === db.session.id
            );
        }

        filteredPosts.forEach(post => {
            const author = db.users.find(u => u.id === post.userId);
            if (!author) return;

            const isLiked = post.likes.includes(db.session.id);
            const isOwner = post.userId === db.session.id;

            const postHTML = `
                <article class="post">
                    <img src="${author.avatar}" class="post-avatar" onclick="nav.to('profile', ${author.id})">
                    <div class="post-body">
                        <div class="post-meta">
                            <div>
                                <span class="user-info">${author.name}</span>
                                <span class="user-handle">@${author.email.split('@')[0]}</span>
                            </div>
                            ${isOwner ? `<i class="fas fa-trash" onclick="app.deletePost(${post.id})" style="color:gray; cursor:pointer"></i>` : ''}
                        </div>
                        <div class="post-text">${post.text}</div>
                        <div class="post-actions">
                            <div class="action-btn ${isLiked ? 'liked' : ''}" onclick="app.toggleLike(${post.id})">
                                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${post.likes.length}
                            </div>
                            <div class="action-btn" onclick="app.addComment(${post.id})">
                                <i class="far fa-comment"></i> ${post.comments.length}
                            </div>
                        </div>
                        ${post.comments.length > 0 ? `
                            <div class="comments-section">
                                ${post.comments.map(c => `<div class="comment"><strong>${c.userName}</strong>: ${c.text}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </article>
            `;
            container.innerHTML += postHTML;
        });
    }
};

// --- NAVIGATION ---
const nav = {
    to(pageId, userId = null) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');

        if (pageId === 'profile') {
            const targetId = userId || db.session.id;
            this.renderProfile(targetId);
        }
    },
    renderProfile(uid) {
        const user = db.users.find(u => u.id === uid);
        const myPosts = db.posts.filter(p => p.userId === uid);
        const isMe = uid === db.session.id;
        const isFollowing = db.session.following.includes(uid);

        document.getElementById('profile-header').innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border)">
                <img src="${user.avatar}" style="width: 80px; height: 80px; border-radius: 50%">
                <h2 style="margin-top: 10px">${user.name}</h2>
                <p style="color: var(--text-dim)">@${user.email.split('@')[0]}</p>
                <div style="margin: 1rem 0; display: flex; gap: 1rem">
                    <span><strong>${user.following.length}</strong> Seguindo</span>
                    <span><strong>${user.followers.length}</strong> Seguidores</span>
                </div>
                ${!isMe ? `
                    <button class="btn-post" style="float: none; width: 100%" onclick="nav.toggleFollow(${uid})">
                        ${isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                ` : ''}
            </div>
        `;
    },
    toggleFollow(uid) {
        const me = db.users.find(u => u.id === db.session.id);
        const target = db.users.find(u => u.id === uid);
        const idx = me.following.indexOf(uid);

        if (idx > -1) {
            me.following.splice(idx, 1);
            target.followers = target.followers.filter(id => id !== me.id);
        } else {
            me.following.push(uid);
            target.followers.push(me.id);
        }
        db.save();
        this.renderProfile(uid);
    }
};

// Iniciar app
if (db.session) auth.startSession(db.session);
