using Bokcirkeln.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bokcirkeln.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Message>()
            .HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Conversation>()
            .HasOne(c => c.Book)
            .WithMany(b => b.Conversations)
            .HasForeignKey(c => c.BookId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Note>()
            .HasOne(n => n.Book)
            .WithMany(b => b.Notes)
            .HasForeignKey(n => n.BookId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Note>()
            .HasOne(n => n.Conversation)
            .WithMany()
            .HasForeignKey(n => n.ConversationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
