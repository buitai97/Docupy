module.exports = {
    apps: [
        {
            name: "backend",
            script: "dist/index.js",
            cwd: "/home/ubuntu/Docupy/backend",
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "frontend",
            script: "npm",
            args: "start",
            cwd: "/home/ubuntu/Docupy/frontend",
            instances: 1,
            autorestart: true,
            watch: false
        }
    ]
};
