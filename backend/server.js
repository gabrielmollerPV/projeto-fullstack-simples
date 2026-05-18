const path = require("path");
const express = require("express");
const cors = require("cors");
const rotas = require("./routes/route");
const { initializeDatabase } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api", rotas);
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "homepage.html"));
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor Online na porta ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Erro ao iniciar servidor:", error);
        process.exit(1);
    });
