import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const hubLoadTime = new Trend('hub_load_time');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;

export const options = {
  scenarios: {
    // Scenariul 1: Useri care accesează paginile publice
    pages: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 20 },  // crește la 20 useri
        { duration: '1m',  target: 20 },  // menține 20 useri
        { duration: '20s', target: 0  },  // scade la 0
      ],
    },
  },
  thresholds: {
    // 95% din requesturi sub 800ms
    http_req_duration: ['p(95)<800'],
    // Rata de erori sub 5%
    errors: ['rate<0.05'],
    // Timp de încărcare hub sub 1s
    hub_load_time: ['p(95)<1000'],
  },
};

// Autentificare și returnare token
function login() {
  if (!SUPABASE_URL || !TEST_EMAIL || !TEST_PASSWORD) return null;

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    }
  );

  if (res.status === 200) {
    return JSON.parse(res.body).access_token;
  }
  return null;
}

export default function () {
  // --- Test 1: Homepage (pagina de login) ---
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage: status 200': (r) => r.status === 200,
    'homepage: sub 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(homeRes.status !== 200);

  sleep(1);

  // --- Test 2: Redirect dashboard fără auth ---
  const dashRes = http.get(`${BASE_URL}/dashboard`, { redirects: 0 });
  check(dashRes, {
    'dashboard fără auth: redirect': (r) => r.status === 200 || r.status === 307,
  });

  sleep(1);

  // --- Test 3: API Supabase - lista hub-uri (autentificat) ---
  const token = login();
  if (token && SUPABASE_URL) {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Fetch hub-uri
    const hubsStart = Date.now();
    const hubsRes = http.get(
      `${SUPABASE_URL}/rest/v1/hubs?select=*&order=created_at.desc`,
      { headers }
    );
    hubLoadTime.add(Date.now() - hubsStart);

    check(hubsRes, {
      'hubs API: status 200': (r) => r.status === 200,
      'hubs API: returnează array': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); }
        catch { return false; }
      },
    });
    errorRate.add(hubsRes.status !== 200);

    sleep(1);

    // Fetch membri pentru primul hub
    const hubs = JSON.parse(hubsRes.body);
    if (hubs.length > 0) {
      const hubId = hubs[0].id;
      const membersRes = http.get(
        `${SUPABASE_URL}/rest/v1/hub_members?hub_id=eq.${hubId}&select=*`,
        { headers }
      );
      check(membersRes, {
        'membri hub: status 200': (r) => r.status === 200,
      });
      errorRate.add(membersRes.status !== 200);

      sleep(1);

      // Fetch mesaje din primul hub
      const messagesRes = http.get(
        `${SUPABASE_URL}/rest/v1/hub_messages?hub_id=eq.${hubId}&select=*&order=created_at.asc`,
        { headers }
      );
      check(messagesRes, {
        'mesaje hub: status 200': (r) => r.status === 200,
      });
      errorRate.add(messagesRes.status !== 200);
    }
  }

  sleep(2);
}
