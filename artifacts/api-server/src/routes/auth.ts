import { Router } from "express";

const router = Router();

const VALID_USERNAME = "balajihostel";
const VALID_PASSWORD = "Sitarama@12";

const REMEMBER_ME_TTL = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * 60 * 1000;

router.post("/auth/login", (req, res) => {
  const { username, password, rememberMe } = req.body as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = rememberMe ? REMEMBER_ME_TTL : SESSION_TTL;
    res.json({ ok: true, username });
    return;
  }

  res.status(401).json({ error: "Invalid username or password" });
});

router.get("/auth/me", (req, res) => {
  if (req.session?.authenticated) {
    res.json({ authenticated: true, username: req.session.username });
    return;
  }
  res.status(401).json({ authenticated: false });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;
