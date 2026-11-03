-- CreateEnum
CREATE TYPE "CandidateProfile" AS ENUM ('ACADEMIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "EduLevel" AS ENUM ('NONE', 'PRIMARY', 'MIDDLE', 'SECONDARY', 'VOCATIONAL');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "eduLevel" "EduLevel";

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "dossierWeight" DOUBLE PRECISION NOT NULL DEFAULT 70,
ADD COLUMN     "minEduLevel" "EduLevel" NOT NULL DEFAULT 'SECONDARY',
ADD COLUMN     "oralWeight" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "profile" "CandidateProfile" NOT NULL DEFAULT 'ACADEMIC';

-- CreateIndex
CREATE INDEX "jobs_profile_idx" ON "jobs"("profile");