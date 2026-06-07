import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffRole, Role } from "@prisma/client";

// PATCH /api/staff/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, lastName, phone, position, role, salary, startDate } =
      await request.json();

    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
    });

    if (!staff) {
      return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newStaffRole = role as StaffRole | undefined;

      const currentUser = await tx.user.findUnique({
        where: { id: staff.userId },
        select: { role: true },
      });

      let newUserRole: Role | undefined;

      // SUPERADMIN ห้ามโดนเปลี่ยนสิทธิ์จากหน้า Staff
      if (currentUser?.role === Role.SUPERADMIN) {
        newUserRole = undefined;
      } else if (newStaffRole === StaffRole.STAFF) {
        newUserRole = Role.USER;
      } else if (newStaffRole !== undefined) {
        newUserRole = Role.ADMIN;
      }

      await tx.user.update({
        where: { id: staff.userId },
        data: {
          ...(name !== undefined && { name }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(newUserRole !== undefined && { role: newUserRole }),
        },
      });

      return tx.staff.update({
        where: { id: params.id },
        data: {
          ...(position !== undefined && { position }),
          ...(role !== undefined && { role: newStaffRole }),
          ...(salary !== undefined && {
            salary: salary ? parseFloat(salary) : null,
          }),
          ...(startDate !== undefined && {
            startDate: new Date(startDate),
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[STAFF_PATCH]", error);

    return NextResponse.json(
      { error: "Failed to update staff" },
      { status: 500 },
    );
  }
}

// DELETE /api/staff/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "ບໍ່ພົບພະນັກງານ" }, { status: 404 });
    }

    // ป้องกันลบตัวเอง
    if (staff.userId === session.user.id) {
      return NextResponse.json(
        { error: "ບໍ່ສາມາດລຶບຕົວເອງໄດ້" },
        { status: 400 },
      );
    }

    // ป้องกัน deactivate SUPERADMIN
    const user = await prisma.user.findUnique({
      where: { id: staff.userId },
      select: { role: true },
    });

    if (user?.role === Role.SUPERADMIN) {
      return NextResponse.json(
        { error: "Cannot deactivate SUPERADMIN" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: params.id },
        data: {
          isActive: false,
        },
      });

      await tx.user.update({
        where: { id: staff.userId },
        data: {
          role: Role.USER,
          deletedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STAFF_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to deactivate staff" },
      { status: 500 },
    );
  }
}
