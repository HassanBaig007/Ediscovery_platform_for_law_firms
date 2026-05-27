const http = require('http');

const req = http.request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const body = JSON.parse(d);
        if (!body.data || !body.data.accessToken) {
            console.log("Login failed:", body);
            return;
        }
        const t = body.data.accessToken;
        console.log("Logged in successfully. Token length:", t.length);

        // Fetch stats
        http.get('http://localhost:5000/api/dashboard/stats', {
            headers: { Authorization: 'Bearer ' + t }
        }, r2 => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
                console.log("Dashboard Stats Response:", JSON.parse(d2));
            });
        });

        // Fetch overview
        http.get('http://localhost:5000/api/dashboard/overview', {
            headers: { Authorization: 'Bearer ' + t }
        }, r3 => {
            let d3 = '';
            r3.on('data', c => d3 += c);
            r3.on('end', () => {
                console.log("Dashboard Overview Response:", JSON.parse(d3));
            });
        });

        // Fetch cases
        http.get('http://localhost:5000/api/cases', {
            headers: { Authorization: 'Bearer ' + t }
        }, r4 => {
            let d4 = '';
            r4.on('data', c => d4 += c);
            r4.on('end', () => {
                const data = JSON.parse(d4);
                console.log("Cases List Response (caseNames):", data.cases ? data.cases.map(c => c.caseName) : data);
            });
        });
    });
});

req.write(JSON.stringify({ email: 'partner@seed.local', password: 'Partner123!' }));
req.end();
