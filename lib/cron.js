import cron from "node-cron"

// Run on the 1st day of every month at 9:00 AM
export function initializeCronJobs() {
  cron.schedule("0 9 1 * *", async () => {
    console.log("Running monthly message cron job...")

    try {
      const response = await fetch(`${process.env.NEXTJS_URL}/api/cron/monthly-message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      })

      const result = await response.json()
      console.log("Monthly cron job completed:", result)
    } catch (error) {
      console.error("Monthly cron job failed:", error)
    }
  })

  console.log("Cron jobs initialized")
}
