import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/auth.service.js";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${process.env.BACKEND_URL ?? "http://localhost:5000"}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0].value ?? "";
                const name = profile.displayName;
                const result = await findOrCreateGoogleUser(profile.id, email, name);
                done(null, result as Express.User);
            } catch (err) {
                done(err as Error);
            }
        }
    )
);

export default passport;
