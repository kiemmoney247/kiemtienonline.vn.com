// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'dulieu.json');
const ADMIN_PASSWORD = 'harry0666'; // Mật khẩu admin mới

function docDuLieu() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const init = {
                nguoiDung: [],
                linkVuot: [],
                lichSuLink: [],
                lichSuRutTien: [],
                yeuCauXacThucSDT: [],
                yeuCau4G: [],
                thongBao: [],
                gmailCam: [],
                rejectedLinks: []
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
            return init;
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        console.error('Lỗi đọc dữ liệu:', e);
        const init = { nguoiDung: [], linkVuot: [], lichSuLink: [], lichSuRutTien: [], yeuCauXacThucSDT: [], yeuCau4G: [], thongBao: [], gmailCam: [], rejectedLinks: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
        return init;
    }
}

function ghiDuLieu(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Lỗi ghi dữ liệu:', e);
    }
}

function taoToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 10; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return token;
}

// Route mặc định - phục vụ index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route admin - phục vụ admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Đăng ký
app.post('/api/dang-ky', (req, res) => {
    const { email, username, password } = req.body;
    const data = docDuLieu();
    if (data.gmailCam.includes(email)) return res.json({ success: false, message: 'Gmail này đã bị cấm.' });
    if (data.nguoiDung.find(u => u.email === email)) return res.json({ success: false, message: 'Gmail đã tồn tại.' });
    const token = taoToken();
    const newUser = {
        email, username, password, token,
        phone: '', verified4G: false,
        createdAt: new Date().toLocaleString('vi-VN'),
        balance: 0, pendingMoney: 0, completedLinks: 0
    };
    data.nguoiDung.push(newUser);
    ghiDuLieu(data);
    res.json({ success: true, token, user: newUser });
});

// API Đăng nhập
app.post('/api/dang-nhap', (req, res) => {
    const { email, password } = req.body;
    const data = docDuLieu();
    if (data.gmailCam.includes(email)) return res.json({ success: false, message: 'Gmail này đã bị cấm.' });
    const user = data.nguoiDung.find(u => u.email === email && u.password === password);
    if (!user) return res.json({ success: false, message: 'Sai thông tin đăng nhập.' });
    res.json({ success: true, user });
});

// API Quên mật khẩu
app.post('/api/quen-mat-khau', (req, res) => {
    const { token } = req.body;
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.token === token);
    if (!user) return res.json({ success: false, message: 'Token không hợp lệ.' });
    const newPass = Math.random().toString(36).slice(-8) + '@A1';
    user.password = newPass;
    ghiDuLieu(data);
    res.json({ success: true, newPassword: newPass, email: user.email });
});

// API Lấy thông tin user
app.get('/api/user/:email', (req, res) => {
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.email === req.params.email);
    if (!user) return res.json({ success: false });
    res.json({ success: true, user });
});

// API Đổi mật khẩu
app.post('/api/doi-mat-khau', (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.email === email && u.password === oldPassword);
    if (!user) return res.json({ success: false, message: 'Mật khẩu gốc không đúng.' });
    user.password = newPassword;
    ghiDuLieu(data);
    res.json({ success: true });
});

// API Xác thực số điện thoại
app.post('/api/xac-thuc-sdt', (req, res) => {
    const { email, phone } = req.body;
    const data = docDuLieu();
    data.yeuCauXacThucSDT.push({ email, phone, time: new Date().toLocaleString('vi-VN'), status: 'pending' });
    ghiDuLieu(data);
    res.json({ success: true });
});

// API Lấy danh sách link vượt
app.get('/api/link-vuot', (req, res) => {
    const data = docDuLieu();
    res.json(data.linkVuot || []);
});

// API Làm link
app.post('/api/lam-link', (req, res) => {
    const { email, linkName, linkUrl } = req.body;
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: 'Không tìm thấy user.' });
    data.lichSuLink.push({
        email, linkName, linkUrl,
        username: user.username,
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now(),
        status: 'pending'
    });
    ghiDuLieu(data);
    res.json({ success: true });
});

// API Rút tiền chuyển khoản
app.post('/api/rut-tien-bank', (req, res) => {
    const { email, bank, account, owner, amount } = req.body;
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: 'Không tìm thấy user.' });
    if ((user.balance || 0) < amount || amount < 50000) return res.json({ success: false, message: 'Số dư không đủ hoặc dưới 50.000đ.' });
    user.balance -= amount;
    data.lichSuRutTien.push({
        email, username: user.username,
        type: 'bank', bank, account, owner, amount,
        time: new Date().toLocaleString('vi-VN'),
        status: 'pending', note: '', seri: '', code: ''
    });
    ghiDuLieu(data);
    res.json({ success: true });
});

// API Rút tiền thẻ cào
app.post('/api/rut-tien-card', (req, res) => {
    const { email, cardType, amount } = req.body;
    const data = docDuLieu();
    const user = data.nguoiDung.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: 'Không tìm thấy user.' });
    if ((user.balance || 0) < amount || amount < 20000) return res.json({ success: false, message: 'Số dư không đủ hoặc dưới 20.000đ.' });
    user.balance -= amount;
    data.lichSuRutTien.push({
        email, username: user.username,
        type: 'card', cardType, amount,
        time: new Date().toLocaleString('vi-VN'),
        status: 'pending', note: '', seri: '', code: ''
    });
    ghiDuLieu(data);
    res.json({ success: true });
});

// ===== API ADMIN =====
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    console.log('Admin login attempt - Mật khẩu nhập:', password, '| Mật khẩu đúng:', ADMIN_PASSWORD);
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Sai mật khẩu admin!' });
    }
});

app.get('/api/admin/data', (req, res) => {
    res.json(docDuLieu());
});

app.post('/api/admin/them-link', (req, res) => {
    const { name, url, url2, reward } = req.body;
    const data = docDuLieu();
    if (data.linkVuot.find(l => l.name.toLowerCase() === name.toLowerCase())) {
        return res.json({ success: false, message: 'Tên link đã tồn tại.' });
    }
    data.linkVuot.push({ name, url, url2: url2 || null, reward: parseInt(reward) || 300, createdAt: new Date().toLocaleString('vi-VN') });
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/xoa-link', (req, res) => {
    const { index } = req.body;
    const data = docDuLieu();
    if (index >= 0 && index < data.linkVuot.length) {
        data.linkVuot.splice(index, 1);
        ghiDuLieu(data);
        res.json({ success: true });
    } else res.json({ success: false, message: 'Không tìm thấy link.' });
});

app.post('/api/admin/duyet-link', (req, res) => {
    const { email, linkName, time, approved } = req.body;
    const data = docDuLieu();
    const idx = data.lichSuLink.findIndex(l => l.email === email && l.linkName === linkName && l.time === time && l.status === 'pending');
    if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    if (approved) {
        data.lichSuLink[idx].status = 'approved';
        const link = data.linkVuot.find(l => linkName.startsWith(l.name));
        const reward = link ? link.reward : 300;
        const user = data.nguoiDung.find(u => u.email === email);
        if (user) {
            user.balance = (user.balance || 0) + reward;
            user.completedLinks = (user.completedLinks || 0) + 1;
        }
    } else {
        data.lichSuLink[idx].status = 'rejected';
        if (!data.rejectedLinks) data.rejectedLinks = [];
        data.rejectedLinks.push({ email, linkName: linkName.split(' (')[0] });
    }
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/duyet-rut-tien', (req, res) => {
    const { email, time, approved, note, seri, code } = req.body;
    const data = docDuLieu();
    const idx = data.lichSuRutTien.findIndex(w => w.email === email && w.time === time && w.status === 'pending');
    if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    if (approved) {
        data.lichSuRutTien[idx].status = 'approved';
        if (note) data.lichSuRutTien[idx].note = note;
        if (seri) data.lichSuRutTien[idx].seri = seri;
        if (code) data.lichSuRutTien[idx].code = code;
    } else {
        data.lichSuRutTien[idx].status = 'rejected';
        if (note) data.lichSuRutTien[idx].note = note;
        const user = data.nguoiDung.find(u => u.email === email);
        if (user) user.balance = (user.balance || 0) + data.lichSuRutTien[idx].amount;
    }
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/duyet-sdt', (req, res) => {
    const { email, phone, time, approved } = req.body;
    const data = docDuLieu();
    const idx = data.yeuCauXacThucSDT.findIndex(p => p.email === email && p.time === time && p.status === 'pending');
    if (idx === -1) return res.json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    data.yeuCauXacThucSDT[idx].status = approved ? 'approved' : 'rejected';
    if (approved) {
        const user = data.nguoiDung.find(u => u.email === email);
        if (user) user.phone = phone;
    }
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/duyet-4g', (req, res) => {
    const { email } = req.body;
    const data = docDuLieu();
    if (data.yeuCau4G.includes(email)) return res.json({ success: false, message: 'Tài khoản này đã được duyệt 4G.' });
    data.yeuCau4G.push(email);
    const user = data.nguoiDung.find(u => u.email === email);
    if (user) user.verified4G = true;
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/xoa-4g', (req, res) => {
    const { email } = req.body;
    const data = docDuLieu();
    data.yeuCau4G = data.yeuCau4G.filter(e => e !== email);
    const user = data.nguoiDung.find(u => u.email === email);
    if (user) user.verified4G = false;
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/gui-thong-bao', (req, res) => {
    const { message } = req.body;
    if (!message) return res.json({ success: false, message: 'Vui lòng nhập nội dung.' });
    const data = docDuLieu();
    data.thongBao.push({ id: 'n_' + Date.now(), message, time: new Date().toLocaleString('vi-VN') });
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/xoa-thong-bao', (req, res) => {
    const { id } = req.body;
    const data = docDuLieu();
    data.thongBao = data.thongBao.filter(n => n.id !== id);
    ghiDuLieu(data);
    res.json({ success: true });
});

app.post('/api/admin/xoa-user', (req, res) => {
    const { email, ban } = req.body;
    const data = docDuLieu();
    data.nguoiDung = data.nguoiDung.filter(u => u.email !== email);
    if (ban) data.gmailCam.push(email);
    ghiDuLieu(data);
    res.json({ success: true });
});

// Bắt lỗi 404
app.use((req, res) => {
    res.status(404).send('Không tìm thấy trang - 404');
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`✅ Web chính: http://localhost:${PORT}/`);
    console.log(`✅ Web admin: http://localhost:${PORT}/admin`);
    console.log(`🔑 Mật khẩu admin: ${ADMIN_PASSWORD}`);
    console.log(`========================================`);
});