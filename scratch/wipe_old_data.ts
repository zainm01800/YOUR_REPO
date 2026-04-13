import { PrismaClient } from "@prisma/client";

async function wipeOldData() {
  const prisma = new PrismaClient();
  try {
    const slug = "northstar-finance";
    console.log(`Searching for workspace with slug: ${slug}`);
    
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: { _count: { select: { runs: true, members: true } } }
    });

    if (!workspace) {
      console.log("No old workspace found. Already clean.");
      return;
    }

    console.log(`Found workspace ${workspace.id}. Deleting...`);
    
    // Cascade delete should handle most things, but we'll be explicit
    await prisma.workspace.delete({
      where: { id: workspace.id }
    });

    console.log("Old workspace data deleted successfully.");
  } catch (error) {
    console.error("Failed to delete old data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeOldData();
