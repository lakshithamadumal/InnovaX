<?php

class Database
{
    public static $connection;

    public static function setUpConnection()
    {
        if (!isset(Database::$connection)) {
            Database::$connection = new mysqli("localhost", "root", "#Lucky2003sql", "innovax_db", 3306);

            if (Database::$connection->connect_error) {
                http_response_code(500);
                die("Connection failed: " . Database::$connection->connect_error);
            }

            Database::$connection->set_charset("utf8mb4");
        }
    }

    public static function escape_string($string)
    {
        Database::setUpConnection();
        return Database::$connection->real_escape_string($string);
    }

    public static function iud($q)
    {
        Database::setUpConnection();
        if (!Database::$connection->query($q)) {
            throw new Exception("Error executing query: " . Database::$connection->error . " | SQL: $q");
        }
    }

    public static function search($q)
    {
        Database::setUpConnection();
        $resultset = Database::$connection->query($q);
        if ($resultset === false) {
            throw new Exception("Error executing query: " . Database::$connection->error . " | SQL: $q");
        }
        return $resultset;
    }

    public static function prepare($q)
    {
        Database::setUpConnection();
        $statement = Database::$connection->prepare($q);
        if ($statement === false) {
            throw new Exception("Error preparing query: " . Database::$connection->error . " | SQL: $q");
        }
        return $statement;
    }
}
