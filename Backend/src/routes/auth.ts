import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "../api-zod";
import {
  createSession,
  clearSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
} from "../lib/auth";
import { UserModel } from "../db";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const user = await (UserModel as any).findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const authUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
  };

  const sid = await createSession({ user: authUser });
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  res.json({ user: authUser, token: sid });
});

router.post("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

export default router;
