const Member = require("../models/Member");

const calculateOwnership = async () => {
  const members = await Member.find({
    membershipStatus: "active",
  }).populate("user", "name email");

  const totalGroupContribution = members.reduce(
    (total, member) => total + member.totalContribution,
    0
  );

  const ownershipData = members.map((member) => {
    let ownershipPercentage = 0;

    if (totalGroupContribution > 0) {
      ownershipPercentage =
        (member.totalContribution / totalGroupContribution) * 100;
    }

    return {
      memberId: member._id,
      memberCode: member.memberCode,
      name: member.user?.name,
      email: member.user?.email,
      totalContribution: member.totalContribution,
      ownershipPercentage: Number(
        ownershipPercentage.toFixed(2)
      ),
    };
  });

  return {
    totalGroupContribution,
    ownershipData,
  };
};

module.exports = calculateOwnership;