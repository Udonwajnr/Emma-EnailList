import cron from "node-cron"

// Schedule monthly messages to run on the 1st day of every month at 9:00 AM
cron.schedule(
  "0 9 1 * *",
  async () => {
    console.log("Running monthly message cron job...")

    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/cron/monthly-messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      console.log("Monthly messages result:", result)
    } catch (error) {
      console.error("Error running monthly message cron job:", error)
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  },
)

console.log("Monthly message cron job scheduled for 1st day of every month at 9:00 AM UTC")
