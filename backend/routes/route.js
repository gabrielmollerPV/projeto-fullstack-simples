const express = require("express");
const multer = require("multer");
const controller = require("../controllers/controller");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 4 * 1024 * 1024
    }
});

router.post("/register", upload.single("foto"), controller.register);
router.post("/login", controller.login);

router.get("/bairros", controller.getBairros);
router.get("/publicacoes", controller.getPublicacoes);
router.post("/publicacoes", upload.single("imagem"), controller.criarPublicacao);

router.get("/publicacoes/:id/comentarios", controller.getComentarios);
router.post("/comentarios", controller.criarComentario);

router.post("/curtir/:id", controller.curtirPublicacao);
router.post("/publicacoes/:id/curtir", controller.curtirPublicacao);

router.get("/perfil/:id", controller.getPerfil);

module.exports = router;
