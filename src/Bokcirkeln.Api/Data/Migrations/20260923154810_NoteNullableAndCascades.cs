using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bokcirkeln.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class NoteNullableAndCascades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Books_BookId",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Conversations_ConversationId",
                table: "Notes");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Notes",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Books_BookId",
                table: "Conversations",
                column: "BookId",
                principalTable: "Books",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Conversations_ConversationId",
                table: "Notes",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Books_BookId",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_Notes_Conversations_ConversationId",
                table: "Notes");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "Notes",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Books_BookId",
                table: "Conversations",
                column: "BookId",
                principalTable: "Books",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_Conversations_ConversationId",
                table: "Notes",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id");
        }
    }
}
