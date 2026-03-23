const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs")
const axios = require("axios")

// ===== CONFIG =====
const botName = "✦⚡ 𝑽𝒐𝒍𝒕𝒂𝒓𝒊𝒂 𝑵𝒆𝒙𝒖𝒔 ⚡✦"
const ownerName = "⚜️𝓐𝓻𝓪𝓼𝓱𝓲⚜️"
const ownerNumber = "254708720384@s.whatsapp.net"

// ===== DATABASE =====
let db = {
    users: {},
    groups: {},
    settings: {
        autoreact: false,
        autotyping: false,
        autostatusview: false
    }
}

// Load DB
if (fs.existsSync("db.json")) {
    db = JSON.parse(fs.readFileSync("db.json"))
}

// Auto-save DB
setInterval(() => {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2))
}, 5000)

// ===== UTIL =====
function getUser(id) {
    if (!db.users[id]) {
        db.users[id] = {
            money: 1000,
            pet: null,
            warns: 0,
            afk: false,
            afkTime: 0,
            afkReason: "",
            memory: ""
        }
    }
    return db.users[id]
}

function savageReply() {
    const replies = [
        "⚡ That was weak.",
        "🌌 Speak with purpose.",
        "💫 You're trying too hard.",
        "🎴 Not impressive.",
        "🌠 Continue… I'm judging.",
        "✨ That wasn't worth my time.",
        "🍥 I expected nothing and still got less."
    ]
    return replies[Math.floor(Math.random() * replies.length)]
}

// ===== BOT =====
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            } else {
                console.log("Logged out.")
            }
        } else if (connection === "open") {
            console.log(`${botName} is online ⚡`)
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (!text) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || from
        const isOwner = sender === ownerNumber
        const user = getUser(sender)

        // ===== AFK RETURN =====
        if (user.afk) {
            const duration = Math.floor((Date.now() - user.afkTime) / 60000)
            user.afk = false

            await sock.sendMessage(from, {
                text: `╭─✦⚡ 𝑽𝒐𝒍𝒕𝒂𝒓𝒊𝒂 𝑵𝒆𝒙𝒖𝒔 ⚡✦─╮
│ ✅ AFK Mode Deactivated ✅ │
├─────────────────────────┤
│ ⏱️ Duration: ${duration} minutes │
│ 🌩️ Welcome back ⚜️ │
╰─────────────────────────╯`
            })
        }

        // ===== OWNER =====
        if (text === ".owner") {
            return sock.sendMessage(from, {
                text: `⚜️ Owner: ${ownerName}`
            })
        }

        if (text === ".shutdown" && isOwner) {
            await sock.sendMessage(from, { text: "⚡ Shutting down…" })
            process.exit()
        }

        // ===== SETTINGS =====
        if (text === ".settings" && isOwner) {
            db.settings.autoreact = !db.settings.autoreact
            return sock.sendMessage(from, { text: "⚡ Settings updated." })
        }

        // ===== ECONOMY =====
        if (text === ".balance") {
            return sock.sendMessage(from, {
                text: `💰 Balance: ${user.money}`
            })
        }

        if (text === ".daily") {
            user.money += 500
            return sock.sendMessage(from, {
                text: "💫 +500 claimed."
            })
        }

        // ===== PET SYSTEM =====
        if (text === ".pet") {
            if (!user.pet) {
                user.pet = {
                    name: "Neko",
                    type: "cat",
                    level: 1
                }
                return sock.sendMessage(from, {
                    text: "🐱 You adopted a cat."
                })
            }
            return sock.sendMessage(from, {
                text: `🐾 ${user.pet.name} (Lv.${user.pet.level})`
            })
        }

        if (text === ".train") {
            if (!user.pet) return

            setTimeout(() => {
                user.pet.level++
            }, 2000)

            return sock.sendMessage(from, {
                text: "🌠 Training started… returns in 2 hours."
            })
        }

        // ===== MEMORY =====
        if (text.startsWith(".mem")) {
            user.memory = text.replace(".mem", "").trim()
            return sock.sendMessage(from, { text: "💫 Memory stored." })
        }

        if (text === ".mymem") {
            return sock.sendMessage(from, {
                text: user.memory || "None stored."
            })
        }

        // ===== AFK =====
        if (text.startsWith(".afk")) {
            user.afk = true
            user.afkTime = Date.now()
            user.afkReason = text.replace(".afk", "").trim()

            return sock.sendMessage(from, {
                text: "🌌 AFK mode activated."
            })
        }

        // ===== FUN =====
        if (text === ".dice") {
            return sock.sendMessage(from, {
                text: `🎲 ${Math.floor(Math.random() * 6) + 1}`
            })
        }

        if (text === ".roast") {
            return sock.sendMessage(from, { text: savageReply() })
        }

        if (text === ".compliment") {
            return sock.sendMessage(from, {
                text: "✨ You're acceptable today."
            })
        }

        if (text === ".vibecheck") {
            return sock.sendMessage(from, {
                text: "🌌 Vibe: unstable."
            })
        }

        // ===== MODERATION =====
        if (text.includes("http")) {
            user.warns++

            if (user.warns >= 3) {
                return sock.sendMessage(from, {
                    text: "⚡ Removed after 3 warnings."
                })
            }

            return sock.sendMessage(from, {
                text: `⚠️ Warning ${user.warns}/3`
            })
        }

        // ===== AI PLACEHOLDER =====
        if (text.startsWith(".ai")) {
            const prompt = text.replace(".ai", "")
            return sock.sendMessage(from, {
                text: `⚡ Processing...\n${prompt}`
            })
        }

        // ===== ACTIONS =====
        if (text.startsWith(".hug")) {
            return sock.sendMessage(from, { text: "🤗 *hugs*" })
        }

        if (text.startsWith(".kiss")) {
            return sock.sendMessage(from, { text: "💋 *kiss*" })
        }

        // ===== DEFAULT =====
        if (isOwner) {
            return sock.sendMessage(from, {
                text: "⚜️ Command acknowledged."
            })
        }

        return sock.sendMessage(from, {
            text: savageReply()
        })
    })
}

startBot()