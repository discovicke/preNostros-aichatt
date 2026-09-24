using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bokcirkeln.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BookRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Rating",
                table: "Books",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RatingMotivation",
                table: "Books",
                type: "TEXT",
                nullable: true);

            // Flyttar senaste Betyg-notens (Kind = 3) siffra + text per bok till de nya kolumnerna.
            migrationBuilder.Sql("""
                UPDATE "Books" SET
                    "Rating" = (SELECT "Rating" FROM "Notes" WHERE "Notes"."BookId" = "Books"."Id" AND "Notes"."Kind" = 3 AND "Notes"."Rating" IS NOT NULL ORDER BY "CreatedAt" DESC LIMIT 1),
                    "RatingMotivation" = (SELECT "Content" FROM "Notes" WHERE "Notes"."BookId" = "Books"."Id" AND "Notes"."Kind" = 3 AND "Notes"."Rating" IS NOT NULL ORDER BY "CreatedAt" DESC LIMIT 1);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "RatingMotivation",
                table: "Books");
        }
    }
}
