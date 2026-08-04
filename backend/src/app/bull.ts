import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import Queue from "../libs/Queue";

export default async function bullMQ(app) {
  console.info("bullMQ started");
  await Queue.process();

  // await Queue.add("VerifyScheduleMessages", {});
  await Queue.add("VerifyTicketsChatBotInactives", {});
  await Queue.add("SendMessageSchenduled", {});

  if (process.env.NODE_ENV !== "production") {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/admin/queues");

    createBullBoard({
      queues: Queue.queues.map((q: any) => new BullAdapter(q.bull) as any),
      serverAdapter
    });

    app.use("/admin/queues", serverAdapter.getRouter());
  }
}
