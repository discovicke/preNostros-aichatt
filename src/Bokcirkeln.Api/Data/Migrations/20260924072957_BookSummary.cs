using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bokcirkeln.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BookSummary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Books",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Books");
        }
    }
}
