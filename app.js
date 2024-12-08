const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const app = express();
const port = 3000
const path = require('path');
require('dotenv').config(); // 환경 변수 로드
app.set('view engine', 'ejs');

// 정적 파일 제공을 위해 public 폴더 설정
// app.use(express.static(path.join(__dirname, 'public')));
      
let client;
// Initialize OpenID Client
async function initializeClient() {
    const issuer = await Issuer.discover('https://cognito-idp.ap-northeast-2.amazonaws.com/ap-northeast-2_gJaBStzT6');
    client = new issuer.Client({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uris: ['http://localhost:3000/home'],
        response_types: ['code']
    });
};
initializeClient().catch(console.error);

app.use(session({
    secret: 'some secret',
    resave: true,
    saveUninitialized: false
}));

const checkAuth = (req, res, next) => {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

app.get('/', checkAuth, (req, res) => {
    console.log(req.isAuthenticated);
    if (req.isAuthenticated) {
        // 로그인 완료 페이지로 리디렉션
        res.render('home', {
            isAuthenticated: req.isAuthenticated,
            userInfo: req.session.userInfo
        });
    } else {
        res.render('home', {
            isAuthenticated: req.isAuthenticated,
            userInfo: req.session.userInfo
        });
    }
});

// 로그인 성공 후 리디렉션될 경로
app.get('/login', (req, res) => {
    console.log("호출")
    console.log(req.query.code);
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'email openid phone',
        state: state,
        nonce: nonce,
    });

    console.log(authUrl);

    res.redirect(authUrl);
});

// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
function getPathFromURL(urlString) {
    try {
        const url = new URL(urlString);
        return url.pathname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

app.get(getPathFromURL('http://localhost:3000/home'), async (req, res) => {
    console.log("호출");
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            'http://localhost:3000/home',
            params,
            {
                nonce: req.session.nonce,
                state: req.session.state
            }
        );

        const userInfo = await client.userinfo(tokenSet.access_token);
        req.session.userInfo = userInfo;

        res.redirect('/');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    const clientId = process.env.CLIENT_ID;  // 환경 변수에서 클라이언트 ID 가져오기
    const logoutUrl = `https://ap-northeast-2gjabstzt6.auth.ap-northeast-2.amazoncognito.com/logout?client_id=${clientId}&logout_uri=http://localhost:3000/home`;
    res.redirect(logoutUrl);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`)
})
