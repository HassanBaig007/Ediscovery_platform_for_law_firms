const http = require('http');

const req = http.request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const t = JSON.parse(d).data.accessToken;
        if (!t) return console.log("Login failed");
        
        http.get('http://localhost:5000/api/cases?qualityView=production', {
            headers: { Authorization: 'Bearer ' + t }
        }, r2 => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                const data = JSON.parse(d2);
                console.log(data.cases ? data.cases.map(c => c.caseName) : data);
            });
        });
    });
});

req.write(JSON.stringify({ email: 'admin@techcorp-case.com', password: 'Password123!' }));
req.end();