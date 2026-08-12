import { Router } from "express";
import stationsRouter from "./stations.routes";
import chargersRouter from "./chargers.routes";
import usersRouter from "./users.routes";
import favoritesRouter from "./favorites.routes";
import reviewsRouter from "./reviews.routes";

const router = Router();

router.use("/stations", stationsRouter);
router.use("/chargers", chargersRouter);
router.use("/users", usersRouter);
router.use("/favorites", favoritesRouter);
router.use("/reviews", reviewsRouter);

export default router;