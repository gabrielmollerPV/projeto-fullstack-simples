const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage
});

const controller = require("../controllers/controller");

router.post(
    "/register",
    upload.single("foto"),
    controller.register
);

router.post(
    "/login",
    controller.login
);

router.get(
    "/publicacoes",
    controller.getPublicacoes
);

router.post(
    "/publicacoes",
    controller.criarPublicacao
);

router.post(
    "/comentarios",
    controller.criarComentario
);

router.post(
    "/curtir/:id",
    controller.curtirPublicacao
);

router.get(
    "/perfil/:id",
    controller.getPerfil
);
router.get(
    "/bairros", 
    controller.getBairros
);



module.exports = router;