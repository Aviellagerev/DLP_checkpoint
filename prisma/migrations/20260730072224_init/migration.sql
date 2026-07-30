-- CreateEnum
CREATE TYPE "DataTypeEnum" AS ENUM ('keywords');

-- CreateTable
CREATE TABLE "DataType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "DataTypeEnum" NOT NULL DEFAULT 'keywords',
    "content" TEXT[],
    "threshold" INTEGER NOT NULL,

    CONSTRAINT "DataType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DataSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DataSetToDataType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DataSetToDataType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DataSetToDataType_B_index" ON "_DataSetToDataType"("B");

-- AddForeignKey
ALTER TABLE "_DataSetToDataType" ADD CONSTRAINT "_DataSetToDataType_A_fkey" FOREIGN KEY ("A") REFERENCES "DataSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DataSetToDataType" ADD CONSTRAINT "_DataSetToDataType_B_fkey" FOREIGN KEY ("B") REFERENCES "DataType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
