// inside getSpendingByCategory(...)
const rows = await Transaction.aggregate([
  // Coerce string dates to Date; if already Date, keep it
  {
    $addFields: {
      _date: {
        $cond: [
          { $eq: [{ $type: "$date" }, "date"] },
          "$date",
          { $toDate: "$date" }
        ]
      }
    }
  },
  { $match: { _date: { $gte: start, $lt: end } } },
  {
    $group: {
      _id: { $ifNull: ["$category", "Uncategorized"] },
      spent: {
        $sum: {
          // Count spending either if type === "expense" OR amount is negative
          $cond: [
            { $eq: ["$type", "expense"] },
            { $abs: "$amount" },
            { $cond: [{ $lt: ["$amount", 0] }, { $multiply: ["$amount", -1] }, 0] }
          ]
        }
      }
    }
  },
  { $sort: { _id: 1 } }
]);

